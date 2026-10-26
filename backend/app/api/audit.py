from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from backend.app.core.database import get_db
from backend.app.models.models import AuditLog
from backend.app.services.audit_service import verify_chain_integrity

router = APIRouter(prefix="/api/v1/audit", tags=["Audit Trail"])

@router.get("/logs")
def get_audit_logs(
    actor: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)

    if actor and actor != "ALL":
        query = query.filter(AuditLog.actor.ilike(f"%{actor}%"))
    if action and action != "ALL":
        query = query.filter(AuditLog.action == action)
    if entity_id:
        query = query.filter(AuditLog.entity_id.ilike(f"%{entity_id}%"))
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (AuditLog.rationale.ilike(search_filter)) |
            (AuditLog.actor.ilike(search_filter)) |
            (AuditLog.entity_id.ilike(search_filter)) |
            (AuditLog.hash.ilike(search_filter))
        )

    total_count = query.count()
    logs = query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()

    return {
        "total": total_count,
        "offset": offset,
        "limit": limit,
        "items": [log.to_dict() for log in logs]
    }

@router.get("/verify")
def check_audit_integrity(db: Session = Depends(get_db)):
    result = verify_chain_integrity(db)
    return result
