from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
import json

from backend.app.core.database import get_db
from backend.app.models.models import Bank, BankMappingConfig, IngestedFile, ReconciliationRun
from backend.app.services.audit_service import record_audit

router = APIRouter(prefix="/api/v1/banks", tags=["Banks"])

class BankMappingUpdateRequest(BaseModel):
    date_format: str = "YYYY-MM-DD"
    timezone: str = "UTC"
    column_mapping: Dict[str, str]
    reference_normalization: Dict[str, Any] = {}
    tolerance_rules: Dict[str, Any] = {}
    actor: str = "admin@reconops.internal"

@router.get("")
def list_banks(db: Session = Depends(get_db)):
    banks = db.query(Bank).all()
    return [b.to_dict() for b in banks]

@router.get("/{bank_id}")
def get_bank_details(bank_id: str, db: Session = Depends(get_db)):
    bank = db.query(Bank).filter(Bank.id == bank_id).first()
    if not bank:
        raise HTTPException(status_code=404, detail="Bank not found")

    mapping = db.query(BankMappingConfig).filter(BankMappingConfig.bank_id == bank_id).order_by(BankMappingConfig.version.desc()).first()
    ingested_files = db.query(IngestedFile).filter(IngestedFile.bank_id == bank_id).order_by(IngestedFile.uploaded_at.desc()).limit(10).all()
    past_runs = db.query(ReconciliationRun).filter(
        (ReconciliationRun.bank_id == bank_id) | (ReconciliationRun.bank_id == "ALL_BANKS")
    ).order_by(ReconciliationRun.start_time.desc()).limit(10).all()

    return {
        "bank": bank.to_dict(),
        "mapping_config": mapping.to_dict() if mapping else None,
        "recent_files": [f.to_dict() for f in ingested_files],
        "recent_runs": [r.to_dict() for r in past_runs]
    }

@router.get("/{bank_id}/mapping")
def get_bank_mapping(bank_id: str, db: Session = Depends(get_db)):
    mapping = db.query(BankMappingConfig).filter(BankMappingConfig.bank_id == bank_id).order_by(BankMappingConfig.version.desc()).first()
    if not mapping:
        # Generate default template
        return {
            "bank_id": bank_id,
            "version": 1,
            "date_format": "YYYY-MM-DD",
            "timezone": "UTC",
            "column_mapping": {
                "reference": "Reference_ID",
                "amount": "Amount",
                "currency": "Currency",
                "direction": "Type",
                "transaction_date": "Date",
                "counterparty": "Beneficiary",
                "narration": "Description"
            },
            "reference_normalization": {"strip_prefix": "", "uppercase": True},
            "tolerance_rules": {"amount_tolerance": 0.05, "date_tolerance_days": 1}
        }
    return mapping.to_dict()

@router.put("/{bank_id}/mapping")
def update_bank_mapping(
    bank_id: str,
    req: BankMappingUpdateRequest,
    db: Session = Depends(get_db)
):
    bank = db.query(Bank).filter(Bank.id == bank_id).first()
    if not bank:
        raise HTTPException(status_code=404, detail="Bank not found")

    # Validate required columns in column mapping
    required_fields = ["reference", "amount", "direction", "transaction_date"]
    missing = [f for f in required_fields if f not in req.column_mapping or not req.column_mapping[f].strip()]
    if missing:
        raise HTTPException(status_code=400, detail=f"Column mapping missing required canonical fields: {', '.join(missing)}")

    # Fetch latest version
    latest = db.query(BankMappingConfig).filter(BankMappingConfig.bank_id == bank_id).order_by(BankMappingConfig.version.desc()).first()
    new_version = (latest.version + 1) if latest else 1

    new_config = BankMappingConfig(
        bank_id=bank_id,
        version=new_version,
        date_format=req.date_format,
        timezone=req.timezone,
        column_mapping=json.dumps(req.column_mapping),
        reference_normalization=json.dumps(req.reference_normalization),
        tolerance_rules=json.dumps(req.tolerance_rules),
        updated_at=datetime.utcnow(),
        updated_by=req.actor
    )
    db.add(new_config)
    db.commit()
    db.refresh(new_config)

    # Tamper-evident audit log
    record_audit(
        db=db,
        actor=req.actor,
        action="BANK_MAPPING_UPDATED",
        entity_type="BANK_MAPPING",
        entity_id=f"{bank_id}-v{new_version}",
        rationale=f"Updated CSV schema mapping & tolerance rules for {bank.name} to version {new_version}.",
        before_state=latest.to_dict() if latest else {},
        after_state=new_config.to_dict()
    )

    return {
        "success": True,
        "message": f"Bank mapping for {bank.name} successfully updated to version {new_version}.",
        "config": new_config.to_dict()
    }
