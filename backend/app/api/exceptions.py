from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timedelta

from backend.app.core.database import get_db
from backend.app.models.models import ExceptionRecord, Transaction, AuditLog
from backend.app.services.audit_service import record_audit

router = APIRouter(prefix="/api/v1/exceptions", tags=["Exceptions"])

class ExceptionActionRequest(BaseModel):
    action: str = Field(..., description="ASSIGN, ADD_NOTE, RESOLVE, ESCALATE, REOPEN, MANUAL_MATCH")
    actor: str = Field(default="analyst@reconops.internal")
    assigned_to: Optional[str] = None
    note: Optional[str] = None
    resolution_reason: Optional[str] = None
    escalate_to_tier: Optional[int] = None
    target_transaction_id: Optional[str] = None

@router.get("")
def list_exceptions(
    category: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    bank_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    tier: Optional[int] = Query(None),
    sla_breached: Optional[bool] = Query(None),
    assigned_to: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(ExceptionRecord)

    if category and category != "ALL":
        query = query.filter(ExceptionRecord.category == category)
    if severity and severity != "ALL":
        query = query.filter(ExceptionRecord.severity == severity)
    if bank_id and bank_id != "ALL":
        query = query.filter(ExceptionRecord.bank_id == bank_id)
    if status and status != "ALL":
        query = query.filter(ExceptionRecord.status == status)
    if tier:
        query = query.filter(ExceptionRecord.tier == tier)
    if assigned_to and assigned_to != "ALL":
        query = query.filter(ExceptionRecord.assigned_to.ilike(f"%{assigned_to}%"))
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (ExceptionRecord.id.ilike(search_filter)) |
            (ExceptionRecord.plain_explanation.ilike(search_filter)) |
            (ExceptionRecord.assigned_to.ilike(search_filter)) |
            (ExceptionRecord.recommended_action.ilike(search_filter))
        )

    now = datetime.utcnow()
    if sla_breached is True:
        query = query.filter(ExceptionRecord.sla_deadline < now, ExceptionRecord.status.notin_(["RESOLVED", "CLOSED"]))
    elif sla_breached is False:
        query = query.filter(ExceptionRecord.sla_deadline >= now)

    total_count = query.count()
    items = query.order_by(
        ExceptionRecord.severity.asc(),  # CRITICAL will sort appropriately
        ExceptionRecord.sla_deadline.asc()
    ).offset(offset).limit(limit).all()

    return {
        "total": total_count,
        "offset": offset,
        "limit": limit,
        "items": [exp.to_dict() for exp in items]
    }

@router.get("/{exception_id}")
def get_exception_detail(exception_id: str, db: Session = Depends(get_db)):
    exp = db.query(ExceptionRecord).filter(ExceptionRecord.id == exception_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Exception not found")

    # Fetch internal & external records
    internal_record = None
    if exp.internal_txn_id:
        int_txn = db.query(Transaction).filter(Transaction.id == exp.internal_txn_id).first()
        if int_txn:
            internal_record = int_txn.to_dict()

    external_record = None
    if exp.external_txn_id:
        ext_txn = db.query(Transaction).filter(Transaction.id == exp.external_txn_id).first()
        if ext_txn:
            external_record = ext_txn.to_dict()

    # Match candidate search
    candidates = []
    if internal_record and not external_record:
        pool = db.query(Transaction).filter(
            Transaction.source == "EXTERNAL_STATEMENT",
            Transaction.bank_id == exp.bank_id,
            Transaction.currency == exp.currency
        ).limit(10).all()
        for p in pool:
            amt_diff = abs(p.amount - internal_record["amount"])
            ref_match = p.reference.strip().upper() == internal_record["reference"].strip().upper()
            score = 0.5 if ref_match else 0.0
            if amt_diff <= 5.0:
                score += 0.4
            candidates.append({
                "transaction": p.to_dict(),
                "confidence_score": round(score, 2),
                "reason": "Matching reference with small variance" if ref_match else "Similar amount and currency"
            })

    # Fetch audit history for this exception
    audit_history = db.query(AuditLog).filter(
        (AuditLog.entity_id == exp.id) | (AuditLog.entity_id.like(f"%{exp.id}%"))
    ).order_by(AuditLog.timestamp.desc()).all()

    result = exp.to_dict()
    result["internal_record"] = internal_record
    result["external_record"] = external_record
    result["candidates"] = sorted(candidates, key=lambda x: x["confidence_score"], reverse=True)[:5]
    result["audit_history"] = [a.to_dict() for a in audit_history]
    return result

@router.post("/{exception_id}/action")
def execute_exception_action(
    exception_id: str,
    req: ExceptionActionRequest,
    db: Session = Depends(get_db)
):
    exp = db.query(ExceptionRecord).filter(ExceptionRecord.id == exception_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Exception not found")

    before_state = exp.to_dict()
    action_type = req.action.upper()
    now = datetime.utcnow()

    if action_type == "ASSIGN":
        if not req.assigned_to:
            raise HTTPException(status_code=400, detail="Assigned analyst name must be specified.")
        exp.assigned_to = req.assigned_to
        exp.status = "INVESTIGATING" if exp.status == "OPEN" else exp.status
        rationale = f"Reassigned exception {exp.id} to {req.assigned_to}."

    elif action_type == "ADD_NOTE":
        if not req.note:
            raise HTTPException(status_code=400, detail="Review note cannot be blank.")
        existing_notes = exp.resolution_notes or ""
        timestamp_prefix = f"[{now.strftime('%Y-%m-%d %H:%M UTC')} by {req.actor}]: "
        exp.resolution_notes = f"{existing_notes}\n{timestamp_prefix}{req.note}".strip()
        rationale = f"Appended review note: {req.note}"

    elif action_type == "ESCALATE":
        target_tier = req.escalate_to_tier or min(4, exp.tier + 1)
        exp.tier = target_tier
        exp.status = "ESCALATED"
        if target_tier == 4:
            exp.assigned_to = "Compliance Oversight Group"
        elif target_tier == 3:
            exp.assigned_to = "Marcus Vance (Operations Lead)"
        rationale = f"Escalated exception {exp.id} to Tier {target_tier}. Reason: {req.note or 'SLA or value threshold escalation'}"

    elif action_type == "RESOLVE":
        if not req.resolution_reason:
            raise HTTPException(status_code=400, detail="A valid resolution reason is required.")
        exp.status = "RESOLVED"
        exp.resolved_at = now
        exp.resolved_by = req.actor
        exp.resolution_reason = req.resolution_reason
        if req.note:
            existing_notes = exp.resolution_notes or ""
            exp.resolution_notes = f"{existing_notes}\n[RESOLVED {now.strftime('%Y-%m-%d')}]: {req.note}".strip()
        rationale = f"Resolved exception {exp.id} with reason '{req.resolution_reason}'."

    elif action_type == "REOPEN":
        exp.status = "OPEN"
        exp.resolved_at = None
        exp.resolved_by = None
        rationale = f"Reopened exception {exp.id}. Reason: {req.note or 'Additional variance detected'}"

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported action '{req.action}'.")

    db.commit()
    db.refresh(exp)

    # Record tamper-evident audit entry
    record_audit(
        db=db,
        actor=req.actor,
        action=f"EXCEPTION_{action_type}",
        entity_type="EXCEPTION",
        entity_id=exp.id,
        rationale=rationale,
        before_state=before_state,
        after_state=exp.to_dict()
    )

    return {
        "success": True,
        "message": rationale,
        "exception": exp.to_dict()
    }
