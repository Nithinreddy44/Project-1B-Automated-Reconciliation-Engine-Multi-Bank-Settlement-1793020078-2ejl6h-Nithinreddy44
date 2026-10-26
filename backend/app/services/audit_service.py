import hashlib
import json
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.models.models import AuditLog

GENESIS_HASH = "0" * 64

def compute_audit_hash(prev_hash: str, timestamp_str: str, actor: str, action: str, entity_type: str, entity_id: str, rationale: str, before_state: str, after_state: str) -> str:
    raw = f"{prev_hash}|{timestamp_str}|{actor}|{action}|{entity_type}|{entity_id}|{rationale}|{before_state}|{after_state}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def record_audit(
    db: Session,
    actor: str,
    action: str,
    entity_type: str,
    entity_id: str,
    rationale: str = "",
    before_state: dict = None,
    after_state: dict = None
) -> AuditLog:
    before_json = json.dumps(before_state or {}, sort_keys=True)
    after_json = json.dumps(after_state or {}, sort_keys=True)
    
    # Get last audit log to link hash
    last_log = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).first()
    prev_hash = last_log.hash if last_log else GENESIS_HASH
    
    now = datetime.utcnow()
    timestamp_str = now.isoformat()
    
    current_hash = compute_audit_hash(
        prev_hash, timestamp_str, actor, action, entity_type, entity_id, rationale, before_json, after_json
    )
    
    audit_entry = AuditLog(
        id=f"AUD-{uuid.uuid4().hex[:12].upper()}",
        timestamp=now,
        actor=actor,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        rationale=rationale,
        before_state=before_json,
        after_state=after_json,
        prev_hash=prev_hash,
        hash=current_hash
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)
    return audit_entry

def verify_chain_integrity(db: Session) -> dict:
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.asc()).all()
    if not logs:
        return {"verified": True, "total_records": 0, "message": "Audit log is empty (clean state)"}
    
    expected_prev = GENESIS_HASH
    for i, log in enumerate(logs):
        if log.prev_hash != expected_prev:
            return {
                "verified": False,
                "broken_at_index": i,
                "log_id": log.id,
                "message": f"Hash chain broken at record {log.id}: previous hash mismatch",
                "total_records": len(logs)
            }
        
        # Verify hash
        computed = compute_audit_hash(
            log.prev_hash,
            log.timestamp.isoformat(),
            log.actor,
            log.action,
            log.entity_type,
            log.entity_id,
            log.rationale,
            log.before_state,
            log.after_state
        )
        if computed != log.hash:
            return {
                "verified": False,
                "broken_at_index": i,
                "log_id": log.id,
                "message": f"Tampering detected at record {log.id}: hash signature mismatch",
                "total_records": len(logs)
            }
        
        expected_prev = log.hash
        
    return {
        "verified": True,
        "total_records": len(logs),
        "latest_hash": expected_prev,
        "message": f"Cryptographic integrity verified across all {len(logs)} audit entries."
    }
