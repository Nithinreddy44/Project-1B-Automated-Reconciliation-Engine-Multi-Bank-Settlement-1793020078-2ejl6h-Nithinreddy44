from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

from backend.app.core.database import get_db
from backend.app.models.models import ReconciliationRun, Transaction, ExceptionRecord
from backend.app.services.reconciliation_engine import run_reconciliation_pipeline
from backend.app.services.audit_service import record_audit

router = APIRouter(prefix="/api/v1/reconciliation", tags=["Reconciliation"])

class TriggerRunRequest(BaseModel):
    bank_id: str = Field(default="JPMC", description="Bank identifier or ALL_BANKS")
    date_from: str = Field(default="2026-10-25")
    date_to: str = Field(default="2026-10-26")
    currency: str = Field(default="USD")
    amount_tolerance: float = Field(default=0.05)
    date_tolerance_days: int = Field(default=1)
    initiated_by: str = Field(default="analyst@reconops.internal")

class ManualMatchRequest(BaseModel):
    internal_transaction_id: str
    external_transaction_id: str
    rationale: str
    actor: str = "analyst@reconops.internal"

@router.post("/run")
def trigger_reconciliation(req: TriggerRunRequest, db: Session = Depends(get_db)):
    if req.bank_id == "ALL_BANKS":
        # Execute for first available bank as demo run
        bank_target = "JPMC"
    else:
        bank_target = req.bank_id

    run = run_reconciliation_pipeline(
        db=db,
        bank_id=bank_target,
        date_from=req.date_from,
        date_to=req.date_to,
        currency=req.currency,
        amount_tolerance=req.amount_tolerance,
        date_tolerance_days=req.date_tolerance_days,
        actor=req.initiated_by
    )
    return run.to_dict()

@router.get("/runs")
def list_reconciliation_runs(db: Session = Depends(get_db)):
    runs = db.query(ReconciliationRun).order_by(ReconciliationRun.start_time.desc()).all()
    return [r.to_dict() for r in runs]

@router.get("/runs/{run_id}")
def get_run_details(run_id: str, db: Session = Depends(get_db)):
    run = db.query(ReconciliationRun).filter(ReconciliationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Reconciliation run not found")
    
    # Get associated exceptions
    exceptions = db.query(ExceptionRecord).filter(ExceptionRecord.run_id == run_id).all()
    
    result = run.to_dict()
    result["exceptions"] = [e.to_dict() for e in exceptions]
    return result

@router.post("/manual-match")
def execute_manual_match(req: ManualMatchRequest, db: Session = Depends(get_db)):
    if not req.rationale or len(req.rationale.strip()) < 10:
        raise HTTPException(
            status_code=400,
            detail="A detailed justification rationale (minimum 10 characters) is required for compliance audit trails."
        )

    int_txn = db.query(Transaction).filter(Transaction.id == req.internal_transaction_id).first()
    ext_txn = db.query(Transaction).filter(Transaction.id == req.external_transaction_id).first()

    if not int_txn or not ext_txn:
        raise HTTPException(status_code=404, detail="One or both transactions could not be found.")

    before_state = {
        "internal_id": int_txn.id,
        "internal_status": int_txn.match_status,
        "external_id": ext_txn.id,
        "external_status": ext_txn.match_status
    }

    int_txn.match_status = "MANUAL_MATCHED"
    int_txn.match_type = "MANUAL"
    int_txn.confidence_score = 1.0
    int_txn.matched_transaction_id = ext_txn.id
    int_txn.match_explanation = f"Manual match approved by {req.actor}. Rationale: {req.rationale}"

    ext_txn.match_status = "MANUAL_MATCHED"
    ext_txn.match_type = "MANUAL"
    ext_txn.confidence_score = 1.0
    ext_txn.matched_transaction_id = int_txn.id
    ext_txn.match_explanation = f"Manual match approved by {req.actor}. Rationale: {req.rationale}"

    # Also resolve any associated exception
    associated_exp = db.query(ExceptionRecord).filter(
        (ExceptionRecord.internal_txn_id == int_txn.id) | (ExceptionRecord.external_txn_id == ext_txn.id)
    ).first()

    if associated_exp:
        associated_exp.status = "RESOLVED"
        associated_exp.resolved_at = datetime.utcnow()
        associated_exp.resolved_by = req.actor
        associated_exp.resolution_reason = "MANUAL_MATCH"
        associated_exp.resolution_notes = req.rationale

    db.commit()

    # Record tamper-evident audit log
    record_audit(
        db=db,
        actor=req.actor,
        action="MANUAL_MATCH_OVERRIDE",
        entity_type="TRANSACTION",
        entity_id=f"{int_txn.id}<->{ext_txn.id}",
        rationale=req.rationale,
        before_state=before_state,
        after_state={
            "internal_id": int_txn.id,
            "internal_status": "MANUAL_MATCHED",
            "external_id": ext_txn.id,
            "external_status": "MANUAL_MATCHED",
            "resolved_exception_id": associated_exp.id if associated_exp else None
        }
    )

    return {
        "success": True,
        "message": f"Transactions successfully manual-matched and audited.",
        "internal_transaction": int_txn.to_dict(),
        "external_transaction": ext_txn.to_dict()
    }
