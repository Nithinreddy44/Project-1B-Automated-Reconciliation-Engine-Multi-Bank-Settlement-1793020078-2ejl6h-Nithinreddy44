from sqlalchemy import Column, String, Integer, Float, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime
import json

Base = declarative_base()

class Bank(Base):
    __tablename__ = "banks"

    id = Column(String(16), primary_key=True)  # e.g. JPMC, BARC, CITI, HSBC, DB
    name = Column(String(128), nullable=False)
    country = Column(String(64), nullable=False)
    currency = Column(String(3), nullable=False)
    supported_formats = Column(Text, default="[]")  # JSON list
    connection_status = Column(String(32), default="ACTIVE")  # ACTIVE, DEGRADED, DISCONNECTED
    last_ingestion_time = Column(DateTime, default=datetime.utcnow)
    last_reconciliation_time = Column(DateTime, default=datetime.utcnow)
    match_rate = Column(Float, default=98.5)
    open_exceptions = Column(Integer, default=0)
    sla_compliance = Column(Float, default=99.2)
    recent_failures = Column(Integer, default=0)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "country": self.country,
            "currency": self.currency,
            "supported_formats": json.loads(self.supported_formats) if self.supported_formats else [],
            "connection_status": self.connection_status,
            "last_ingestion_time": self.last_ingestion_time.isoformat() if self.last_ingestion_time else None,
            "last_reconciliation_time": self.last_reconciliation_time.isoformat() if self.last_reconciliation_time else None,
            "match_rate": self.match_rate,
            "open_exceptions": self.open_exceptions,
            "sla_compliance": self.sla_compliance,
            "recent_failures": self.recent_failures,
        }

class BankMappingConfig(Base):
    __tablename__ = "bank_mapping_configs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    bank_id = Column(String(16), nullable=False)
    version = Column(Integer, default=1)
    date_format = Column(String(32), default="YYYY-MM-DD")
    timezone = Column(String(32), default="UTC")
    column_mapping = Column(Text, default="{}")  # JSON dict
    reference_normalization = Column(Text, default="{}")  # JSON dict
    tolerance_rules = Column(Text, default="{}")  # JSON dict
    updated_at = Column(DateTime, default=datetime.utcnow)
    updated_by = Column(String(64), default="admin@reconops.internal")

    def to_dict(self):
        return {
            "id": self.id,
            "bank_id": self.bank_id,
            "version": self.version,
            "date_format": self.date_format,
            "timezone": self.timezone,
            "column_mapping": json.loads(self.column_mapping) if self.column_mapping else {},
            "reference_normalization": json.loads(self.reference_normalization) if self.reference_normalization else {},
            "tolerance_rules": json.loads(self.tolerance_rules) if self.tolerance_rules else {},
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "updated_by": self.updated_by,
        }

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String(64), primary_key=True)
    source = Column(String(32), nullable=False)  # INTERNAL_LEDGER or EXTERNAL_STATEMENT
    bank_id = Column(String(16), nullable=False)
    reference = Column(String(64), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False)
    direction = Column(String(8), nullable=False)  # DEBIT or CREDIT
    transaction_date = Column(String(32), nullable=False)
    value_date = Column(String(32), nullable=True)
    counterparty = Column(String(128), default="")
    narration = Column(Text, default="")
    source_file = Column(String(128), default="internal_ledger.csv")
    match_status = Column(String(32), default="UNMATCHED")  # MATCHED, UNMATCHED, EXCEPTION, MANUAL_MATCHED
    match_type = Column(String(32), default="NONE")  # EXACT, FUZZY, RULE_BASED, NONE
    confidence_score = Column(Float, default=0.0)
    matched_transaction_id = Column(String(64), nullable=True)
    match_explanation = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "source": self.source,
            "bank_id": self.bank_id,
            "reference": self.reference,
            "amount": self.amount,
            "currency": self.currency,
            "direction": self.direction,
            "transaction_date": self.transaction_date,
            "value_date": self.value_date,
            "counterparty": self.counterparty,
            "narration": self.narration,
            "source_file": self.source_file,
            "match_status": self.match_status,
            "match_type": self.match_type,
            "confidence_score": self.confidence_score,
            "matched_transaction_id": self.matched_transaction_id,
            "match_explanation": self.match_explanation,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class ReconciliationRun(Base):
    __tablename__ = "reconciliation_runs"

    id = Column(String(64), primary_key=True)
    run_number = Column(String(32), nullable=False, unique=True)
    bank_id = Column(String(16), nullable=False)
    date_from = Column(String(32), nullable=False)
    date_to = Column(String(32), nullable=False)
    currency = Column(String(3), default="USD")
    rules_applied = Column(Text, default="[]")  # JSON
    status = Column(String(32), default="COMPLETED")  # RUNNING, COMPLETED, COMPLETED_WITH_WARNINGS, FAILED
    total_records = Column(Integer, default=0)
    matched_records = Column(Integer, default=0)
    unmatched_records = Column(Integer, default=0)
    exceptions_count = Column(Integer, default=0)
    match_rate = Column(Float, default=0.0)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, default=datetime.utcnow)
    elapsed_seconds = Column(Float, default=0.0)
    pipeline_stages = Column(Text, default="[]")  # JSON list of stages
    initiated_by = Column(String(64), default="system_scheduler")

    def to_dict(self):
        return {
            "id": self.id,
            "run_number": self.run_number,
            "bank_id": self.bank_id,
            "date_from": self.date_from,
            "date_to": self.date_to,
            "currency": self.currency,
            "rules_applied": json.loads(self.rules_applied) if self.rules_applied else [],
            "status": self.status,
            "total_records": self.total_records,
            "matched_records": self.matched_records,
            "unmatched_records": self.unmatched_records,
            "exceptions_count": self.exceptions_count,
            "match_rate": self.match_rate,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "elapsed_seconds": self.elapsed_seconds,
            "pipeline_stages": json.loads(self.pipeline_stages) if self.pipeline_stages else [],
            "initiated_by": self.initiated_by,
        }

class ExceptionRecord(Base):
    __tablename__ = "exceptions"

    id = Column(String(32), primary_key=True)  # EXP-8001
    run_id = Column(String(64), nullable=True)
    category = Column(String(64), nullable=False)
    severity = Column(String(16), nullable=False)  # CRITICAL, HIGH, MEDIUM, LOW
    bank_id = Column(String(16), nullable=False)
    internal_txn_id = Column(String(64), nullable=True)
    external_txn_id = Column(String(64), nullable=True)
    discrepancy_amount = Column(Float, default=0.0)
    currency = Column(String(3), default="USD")
    plain_explanation = Column(Text, nullable=False)
    details_json = Column(Text, default="{}")
    status = Column(String(32), default="OPEN")  # OPEN, INVESTIGATING, ESCALATED, RESOLVED, CLOSED
    tier = Column(Integer, default=2)  # 1 (Auto), 2 (Analyst), 3 (Lead/SLA), 4 (Compliance)
    sla_deadline = Column(DateTime, nullable=False)
    sla_minutes_total = Column(Integer, default=120)
    assigned_to = Column(String(64), default="Sarah Jenkins (Senior Analyst)")
    recommended_action = Column(Text, default="")
    resolution_notes = Column(Text, nullable=True)
    resolution_reason = Column(String(128), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        # Calculate SLA minutes remaining
        now = datetime.utcnow()
        minutes_remaining = int((self.sla_deadline - now).total_seconds() / 60) if self.sla_deadline else 0
        is_breached = minutes_remaining <= 0 and self.status not in ["RESOLVED", "CLOSED"]

        return {
            "id": self.id,
            "run_id": self.run_id,
            "category": self.category,
            "severity": self.severity,
            "bank_id": self.bank_id,
            "internal_txn_id": self.internal_txn_id,
            "external_txn_id": self.external_txn_id,
            "discrepancy_amount": self.discrepancy_amount,
            "currency": self.currency,
            "plain_explanation": self.plain_explanation,
            "details": json.loads(self.details_json) if self.details_json else {},
            "status": self.status,
            "tier": self.tier,
            "sla_deadline": self.sla_deadline.isoformat() if self.sla_deadline else None,
            "sla_minutes_total": self.sla_minutes_total,
            "sla_minutes_remaining": minutes_remaining,
            "is_breached": is_breached,
            "assigned_to": self.assigned_to,
            "recommended_action": self.recommended_action,
            "resolution_notes": self.resolution_notes,
            "resolution_reason": self.resolution_reason,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "resolved_by": self.resolved_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(64), primary_key=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    actor = Column(String(64), nullable=False)
    action = Column(String(64), nullable=False)
    entity_type = Column(String(32), nullable=False)
    entity_id = Column(String(64), nullable=False)
    rationale = Column(Text, default="")
    before_state = Column(Text, default="{}")
    after_state = Column(Text, default="{}")
    prev_hash = Column(String(64), nullable=False)
    hash = Column(String(64), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "actor": self.actor,
            "action": self.action,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "rationale": self.rationale,
            "before_state": json.loads(self.before_state) if self.before_state else {},
            "after_state": json.loads(self.after_state) if self.after_state else {},
            "prev_hash": self.prev_hash,
            "hash": self.hash,
        }

class IngestedFile(Base):
    __tablename__ = "ingested_files"

    id = Column(String(64), primary_key=True)
    filename = Column(String(128), nullable=False)
    bank_id = Column(String(16), nullable=False)
    format = Column(String(16), nullable=False)
    file_hash = Column(String(64), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    records_read = Column(Integer, default=0)
    records_accepted = Column(Integer, default=0)
    records_rejected = Column(Integer, default=0)
    status = Column(String(32), default="COMPLETED")  # COMPLETED, COMPLETED_WITH_WARNINGS, FAILED
    parse_warnings = Column(Text, default="[]")
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    uploaded_by = Column(String(64), default="analyst@reconops.internal")

    def to_dict(self):
        return {
            "id": self.id,
            "filename": self.filename,
            "bank_id": self.bank_id,
            "format": self.format,
            "file_hash": self.file_hash,
            "file_size_bytes": self.file_size_bytes,
            "records_read": self.records_read,
            "records_accepted": self.records_accepted,
            "records_rejected": self.records_rejected,
            "status": self.status,
            "parse_warnings": json.loads(self.parse_warnings) if self.parse_warnings else [],
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "uploaded_by": self.uploaded_by,
        }
