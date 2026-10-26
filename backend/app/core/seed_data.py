import json
import uuid
from datetime import datetime, timedelta
import random
from sqlalchemy.orm import Session

from backend.app.core.database import SessionLocal, init_db
from backend.app.models.models import (
    Bank, BankMappingConfig, Transaction, ReconciliationRun, ExceptionRecord, AuditLog, IngestedFile
)
from backend.app.services.audit_service import record_audit, GENESIS_HASH

def seed_database():
    init_db()
    db: Session = SessionLocal()

    # Check if already seeded
    if db.query(Bank).count() > 0:
        db.close()
        return

    print("Seeding ReconOps multi-bank database with realistic financial operations data...")

    # 1. Banks
    banks_data = [
        {
            "id": "JPMC",
            "name": "JPMorgan Chase & Co.",
            "country": "United States",
            "currency": "USD",
            "supported_formats": json.dumps(["CSV", "MT940", "CAMT.053"]),
            "connection_status": "ACTIVE",
            "match_rate": 99.4,
            "open_exceptions": 3,
            "sla_compliance": 99.8,
            "recent_failures": 0,
        },
        {
            "id": "BARC",
            "name": "Barclays Bank UK",
            "country": "United Kingdom",
            "currency": "GBP",
            "supported_formats": json.dumps(["CSV", "MT940"]),
            "connection_status": "ACTIVE",
            "match_rate": 98.2,
            "open_exceptions": 4,
            "sla_compliance": 98.6,
            "recent_failures": 0,
        },
        {
            "id": "CITI",
            "name": "Citibank N.A.",
            "country": "United States",
            "currency": "USD",
            "supported_formats": json.dumps(["CSV", "MT940", "CAMT.053"]),
            "connection_status": "ACTIVE",
            "match_rate": 99.1,
            "open_exceptions": 2,
            "sla_compliance": 99.5,
            "recent_failures": 0,
        },
        {
            "id": "HSBC",
            "name": "HSBC Global Banking",
            "country": "United Kingdom",
            "currency": "EUR",
            "supported_formats": json.dumps(["CSV", "MT940", "CAMT.053"]),
            "connection_status": "DEGRADED",
            "match_rate": 96.8,
            "open_exceptions": 7,
            "sla_compliance": 94.2,
            "recent_failures": 1,
        },
        {
            "id": "DB",
            "name": "Deutsche Bank AG",
            "country": "Germany",
            "currency": "EUR",
            "supported_formats": json.dumps(["CSV", "MT940"]),
            "connection_status": "ACTIVE",
            "match_rate": 98.9,
            "open_exceptions": 2,
            "sla_compliance": 99.1,
            "recent_failures": 0,
        },
    ]

    for b in banks_data:
        bank = Bank(**b)
        db.add(bank)

    # 2. Bank Mapping Configs
    mappings = [
        {
            "bank_id": "JPMC",
            "version": 3,
            "date_format": "YYYY-MM-DD",
            "timezone": "America/New_York",
            "column_mapping": json.dumps({
                "reference": "Reference_Number",
                "amount": "Net_Amount",
                "currency": "ISO_Currency",
                "direction": "Credit_Debit_Flag",
                "transaction_date": "Posting_Date",
                "counterparty": "Sender_Receiver_Info",
                "narration": "Payment_Details"
            }),
            "reference_normalization": json.dumps({"strip_prefix": "JPM-", "uppercase": True}),
            "tolerance_rules": json.dumps({"amount_tolerance": 0.02, "date_tolerance_days": 1}),
            "updated_by": "lead_architect@reconops.internal"
        },
        {
            "bank_id": "BARC",
            "version": 2,
            "date_format": "DD/MM/YYYY",
            "timezone": "Europe/London",
            "column_mapping": json.dumps({
                "reference": "Txn_Ref",
                "amount": "Amount",
                "currency": "Curr",
                "direction": "Type",
                "transaction_date": "Date",
                "counterparty": "Beneficiary",
                "narration": "Description"
            }),
            "reference_normalization": json.dumps({"strip_prefix": "BARC/", "uppercase": True}),
            "tolerance_rules": json.dumps({"amount_tolerance": 0.05, "date_tolerance_days": 2}),
            "updated_by": "ops_admin@reconops.internal"
        },
        {
            "bank_id": "HSBC",
            "version": 4,
            "date_format": "YYYY-MM-DD",
            "timezone": "Europe/London",
            "column_mapping": json.dumps({
                "reference": "Customer_Ref",
                "amount": "Settlement_Amt",
                "currency": "Ccy",
                "direction": "D_C_Ind",
                "transaction_date": "Value_Dt",
                "counterparty": "Ordering_Inst",
                "narration": "Remittance_Text"
            }),
            "reference_normalization": json.dumps({"strip_spaces": True, "uppercase": True}),
            "tolerance_rules": json.dumps({"amount_tolerance": 0.10, "date_tolerance_days": 1}),
            "updated_by": "system_migrations@reconops.internal"
        }
    ]
    for m in mappings:
        db.add(BankMappingConfig(**m))

    # 3. Ingested files history
    now = datetime.utcnow()
    files = [
        {
            "id": "FILE-JPMC-901",
            "filename": "JPMC_SETTLEMENT_20261025.csv",
            "bank_id": "JPMC",
            "format": "CSV",
            "file_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            "file_size_bytes": 1428500,
            "records_read": 1420,
            "records_accepted": 1418,
            "records_rejected": 2,
            "status": "COMPLETED",
            "parse_warnings": json.dumps(["2 records omitted: trailing whitespace in header"]),
            "uploaded_at": now - timedelta(hours=8),
        },
        {
            "id": "FILE-BARC-902",
            "filename": "BARCLAYS_STMT_940_20261025.txt",
            "bank_id": "BARC",
            "format": "MT940",
            "file_hash": "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
            "file_size_bytes": 892400,
            "records_read": 840,
            "records_accepted": 840,
            "records_rejected": 0,
            "status": "COMPLETED",
            "parse_warnings": json.dumps([]),
            "uploaded_at": now - timedelta(hours=7),
        },
        {
            "id": "FILE-HSBC-903",
            "filename": "HSBC_CAMT053_EUR_20261026.xml",
            "bank_id": "HSBC",
            "format": "CAMT.053",
            "file_hash": "4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce",
            "file_size_bytes": 2150000,
            "records_read": 1150,
            "records_accepted": 1142,
            "records_rejected": 8,
            "status": "COMPLETED_WITH_WARNINGS",
            "parse_warnings": json.dumps(["8 records flagged: missing ISO IBAN prefix, fell back to account ref"]),
            "uploaded_at": now - timedelta(hours=3),
        }
    ]
    for f in files:
        db.add(IngestedFile(**f))

    # 4. Generate 250 matched transaction pairs across banks
    print("Generating matched pairs...")
    counterparties = ["Apex Trading LLC", "Global Equities Inc", "Starlight Clearing", "Vanguard Settlement", "Citadel Securities", "Bluecrest Capital", "Alpha Liquidity Ltd", "Horizon Global FX"]
    
    for i in range(1, 151):
        bank_id = random.choice(["JPMC", "BARC", "CITI", "HSBC", "DB"])
        curr = "USD" if bank_id in ["JPMC", "CITI"] else ("GBP" if bank_id == "BARC" else "EUR")
        ref = f"SETTLE-2026-{bank_id}-{1000 + i}"
        amt = round(random.uniform(5000.0, 950000.0), 2)
        direction = "CREDIT" if i % 2 == 0 else "DEBIT"
        txn_date = "2026-10-25" if i <= 100 else "2026-10-26"
        cpty = random.choice(counterparties)
        
        # Internal record
        int_id = f"INT-{bank_id}-{i:04d}"
        ext_id = f"EXT-{bank_id}-{i:04d}"
        
        int_txn = Transaction(
            id=int_id,
            source="INTERNAL_LEDGER",
            bank_id=bank_id,
            reference=ref,
            amount=amt,
            currency=curr,
            direction=direction,
            transaction_date=txn_date,
            value_date=txn_date,
            counterparty=cpty,
            narration=f"Settlement batch {ref} via {cpty}",
            source_file="internal_general_ledger.csv",
            match_status="MATCHED",
            match_type="EXACT" if i % 4 != 0 else "RULE_BASED",
            confidence_score=1.0 if i % 4 != 0 else 0.95,
            matched_transaction_id=ext_id,
            match_explanation="Exact multi-key match on Reference, Amount, Currency, and Value Date" if i % 4 != 0 else "Rule-based match: 1-day value date variance within acceptable tolerance window",
            created_at=now - timedelta(hours=12)
        )
        
        # External statement record
        ext_amt = amt if i % 4 != 0 else round(amt + random.choice([0.01, -0.01]), 2)
        ext_txn = Transaction(
            id=ext_id,
            source="EXTERNAL_STATEMENT",
            bank_id=bank_id,
            reference=ref,
            amount=ext_amt,
            currency=curr,
            direction=direction,
            transaction_date=txn_date,
            value_date=txn_date,
            counterparty=cpty,
            narration=f"STMT {ref} {cpty} RTGS CLR",
            source_file=f"{bank_id}_statement.csv",
            match_status="MATCHED",
            match_type="EXACT" if i % 4 != 0 else "RULE_BASED",
            confidence_score=1.0 if i % 4 != 0 else 0.95,
            matched_transaction_id=int_id,
            match_explanation="Exact multi-key match on Reference, Amount, Currency, and Value Date" if i % 4 != 0 else "Rule-based match: 1-day value date variance within acceptable tolerance window",
            created_at=now - timedelta(hours=10)
        )
        
        db.add(int_txn)
        db.add(ext_txn)

    # 5. Seed the 18 Exception Categories specifically detailed in the specification
    print("Generating comprehensive 18 exception categories...")
    
    exceptions_catalog = [
        {
            "id": "EXP-8001",
            "category": "DIRECTION_REVERSAL",
            "severity": "CRITICAL",
            "bank_id": "HSBC",
            "amt": 1250000.00,
            "curr": "EUR",
            "tier": 4,
            "sla_mins": 30, # Deliberate 30-min escalation SLA target from PDF!
            "mins_left": 18,
            "int_ref": "HSBC-REV-9921",
            "int_dir": "CREDIT",
            "ext_dir": "DEBIT",
            "plain": "CRITICAL: Transaction HSBC-REV-9921 booked as CREDIT (€1,250,000.00) in internal ledger but debited as DEBIT by bank statement. Creates doubled financial exposure (€2.50M).",
            "rec_action": "Execute immediate bank desk recall. Halt automated batch settlement.",
            "assigned_to": "Sarah Jenkins (Senior Analyst)"
        },
        {
            "id": "EXP-8002",
            "category": "MISSING_INTERNAL_RECORD",
            "severity": "HIGH",
            "bank_id": "JPMC",
            "amt": 485000.00,
            "curr": "USD",
            "tier": 2,
            "sla_mins": 240,
            "mins_left": 135,
            "int_ref": "UNBOOKED-JPM-4412",
            "int_dir": "CREDIT",
            "ext_dir": "CREDIT",
            "plain": "Bank statement reports credit of $485,000.00 from Citadel Securities under ref JPM-4412. No matching internal ledger entry exists in Treasury system.",
            "rec_action": "Request remittance advice from Citadel Securities; book treasury cash inflow.",
            "assigned_to": "Liam Chen (Reconciliation Operator)"
        },
        {
            "id": "EXP-8003",
            "category": "MISSING_EXTERNAL_RECORD",
            "severity": "HIGH",
            "bank_id": "BARC",
            "amt": 320000.00,
            "curr": "GBP",
            "tier": 2,
            "sla_mins": 240,
            "mins_left": 92,
            "int_ref": "BARC-OUT-8199",
            "int_dir": "DEBIT",
            "ext_dir": "DEBIT",
            "plain": "Internal ledger recorded outbound settlement £320,000.00 on 2026-10-25, but Barclays statement contains no corresponding debit record.",
            "rec_action": "Verify if payment instruction was queued at CHAPS cut-off or rejected by clearing.",
            "assigned_to": "Elena Rostova (Operations Specialist)"
        },
        {
            "id": "EXP-8004",
            "category": "AMOUNT_MISMATCH",
            "severity": "HIGH",
            "bank_id": "CITI",
            "amt": 15420.50,
            "curr": "USD",
            "tier": 2,
            "sla_mins": 180,
            "mins_left": 45,
            "int_ref": "CITI-CORP-1088",
            "int_dir": "DEBIT",
            "ext_dir": "DEBIT",
            "plain": "Internal ledger shows $750,000.00 whereas Citi statement reports $734,579.50. Discrepancy of $15,420.50.",
            "rec_action": "Verify if undisclosed intermediary bank deductions were applied to gross transfer.",
            "assigned_to": "Sarah Jenkins (Senior Analyst)"
        },
        {
            "id": "EXP-8005",
            "category": "DUPLICATE_TRANSACTION",
            "severity": "CRITICAL",
            "bank_id": "JPMC",
            "amt": 890000.00,
            "curr": "USD",
            "tier": 3,
            "sla_mins": 60,
            "mins_left": 12,
            "int_ref": "JPMC-DUP-7714",
            "int_dir": "DEBIT",
            "ext_dir": "DEBIT",
            "plain": "Two identical debit entries of $890,000.00 with identical UTR reference appeared on statement within 4 minutes. Potential double-debit glitch.",
            "rec_action": "Flag payment duplicate with JPMC intraday desk; request immediate reversal credit.",
            "assigned_to": "Marcus Vance (Operations Lead)"
        },
        {
            "id": "EXP-8006",
            "category": "DATE_MISMATCH",
            "severity": "MEDIUM",
            "bank_id": "DB",
            "amt": 210000.00,
            "curr": "EUR",
            "tier": 2,
            "sla_mins": 360,
            "mins_left": 210,
            "int_ref": "DB-DATE-3321",
            "int_dir": "CREDIT",
            "ext_dir": "CREDIT",
            "plain": "Internal value date is 2026-10-23, while Deutsche Bank statement cleared on 2026-10-26 (3-day lag across weekend holiday). Exceeds 2-day tolerance.",
            "rec_action": "Accept date variance if confirmed Target2 holiday delay; apply holiday calendar override.",
            "assigned_to": "Liam Chen (Reconciliation Operator)"
        },
        {
            "id": "EXP-8007",
            "category": "CURRENCY_MISMATCH",
            "severity": "HIGH",
            "bank_id": "HSBC",
            "amt": 65000.00,
            "curr": "EUR",
            "tier": 3,
            "sla_mins": 120,
            "mins_left": 68,
            "int_ref": "HSBC-CCY-5501",
            "int_dir": "CREDIT",
            "ext_dir": "CREDIT",
            "plain": "Internal ledger booked settlement in USD ($65,000.00), but HSBC statement settled in EUR (€60,185.18) without cross-currency authorization.",
            "rec_action": "Investigate FX auto-conversion by intermediary correspondent; post FX revaluation journal.",
            "assigned_to": "Elena Rostova (Operations Specialist)"
        },
        {
            "id": "EXP-8008",
            "category": "PARTIAL_MATCH",
            "severity": "MEDIUM",
            "bank_id": "BARC",
            "amt": 120000.00,
            "curr": "GBP",
            "tier": 2,
            "sla_mins": 240,
            "mins_left": 185,
            "int_ref": "BARC-SPLIT-901",
            "int_dir": "CREDIT",
            "ext_dir": "CREDIT",
            "plain": "Internal invoice of £300,000.00 matched partially against a first statement tranche of £180,000.00. Remaining £120,000.00 outstanding.",
            "rec_action": "Hold remaining balance open pending second batch installment from counterparty.",
            "assigned_to": "Liam Chen (Reconciliation Operator)"
        },
        {
            "id": "EXP-8009",
            "category": "NETTED_SETTLEMENT",
            "severity": "MEDIUM",
            "bank_id": "CITI",
            "amt": 42500.00,
            "curr": "USD",
            "tier": 2,
            "sla_mins": 300,
            "mins_left": 240,
            "int_ref": "CITI-NET-404",
            "int_dir": "CREDIT",
            "ext_dir": "CREDIT",
            "plain": "Single bank credit of $1,257,500.00 corresponds to 4 internal gross sales minus $42,500.00 in netting deductions.",
            "rec_action": "Perform 1-to-N multi-transaction match against the merchant netting breakdown file.",
            "assigned_to": "Sarah Jenkins (Senior Analyst)"
        },
        {
            "id": "EXP-8010",
            "category": "FEE_DEDUCTION",
            "severity": "LOW",
            "bank_id": "JPMC",
            "amt": 35.00,
            "curr": "USD",
            "tier": 1,
            "sla_mins": 480,
            "mins_left": 360,
            "int_ref": "JPMC-FEE-1290",
            "int_dir": "CREDIT",
            "ext_dir": "CREDIT",
            "plain": "Transfer of $25,000.00 received as $24,965.00 due to a standard $35.00 correspondent bank wire fee.",
            "rec_action": "Auto-resolve via rule: post $35.00 bank charge expense to account 6100-BANK-FEES.",
            "assigned_to": "Auto-Reconciler (Tier 1)"
        },
        {
            "id": "EXP-8011",
            "category": "FX_VARIANCE",
            "severity": "MEDIUM",
            "bank_id": "DB",
            "amt": 1840.20,
            "curr": "EUR",
            "tier": 2,
            "sla_mins": 360,
            "mins_left": 280,
            "int_ref": "DB-FX-9988",
            "int_dir": "DEBIT",
            "ext_dir": "DEBIT",
            "plain": "Spot trade settled with €1,840.20 FX variance against booked ECB rate due to market movement during T+2 clearing.",
            "rec_action": "Allocate FX variance to realize gain/loss ledger.",
            "assigned_to": "Elena Rostova (Operations Specialist)"
        },
        {
            "id": "EXP-8012",
            "category": "STALE_TRANSACTION",
            "severity": "HIGH",
            "bank_id": "BARC",
            "amt": 98500.00,
            "curr": "GBP",
            "tier": 3,
            "sla_mins": 120,
            "mins_left": 15,
            "int_ref": "BARC-STALE-003",
            "int_dir": "DEBIT",
            "ext_dir": "DEBIT",
            "plain": "Transaction was initiated 34 days ago (2026-09-22) and remains uncleared on Barclays ledger. Breaches 30-day statutory settlement window.",
            "rec_action": "Initiate formal payment cancellation and funds recovery query with Barclays.",
            "assigned_to": "Marcus Vance (Operations Lead)"
        },
        {
            "id": "EXP-8013",
            "category": "FORMAT_ERROR",
            "severity": "MEDIUM",
            "bank_id": "HSBC",
            "amt": 74000.00,
            "curr": "EUR",
            "tier": 2,
            "sla_mins": 240,
            "mins_left": 160,
            "int_ref": "HSBC-FMT-881",
            "int_dir": "CREDIT",
            "ext_dir": "CREDIT",
            "plain": "CAMT.053 message contained corrupted XML entity in <Amt> tag ('74000,00' with comma decimal instead of standard dot).",
            "rec_action": "Approve sanitized decimal representation and update HSBC CAMT ingestion regex.",
            "assigned_to": "Liam Chen (Reconciliation Operator)"
        },
        {
            "id": "EXP-8014",
            "category": "REFERENCE_TRUNCATION",
            "severity": "MEDIUM",
            "bank_id": "JPMC",
            "amt": 165000.00,
            "curr": "USD",
            "tier": 2,
            "sla_mins": 300,
            "mins_left": 195,
            "int_ref": "JPMC-CORP-TRUNC-9988776655",
            "int_dir": "DEBIT",
            "ext_dir": "DEBIT",
            "plain": "Internal reference 'JPMC-CORP-TRUNC-9988776655' (27 chars) was clipped to 16 characters ('JPMC-CORP-TRUNC-') in legacy MT940 :20: field.",
            "rec_action": "Accept fuzzy reference match backed by identical amount ($165,000) and counterparty.",
            "assigned_to": "Sarah Jenkins (Senior Analyst)"
        },
        {
            "id": "EXP-8015",
            "category": "TIMEZONE_OFFSET",
            "severity": "LOW",
            "bank_id": "CITI",
            "amt": 54000.00,
            "curr": "USD",
            "tier": 1,
            "sla_mins": 480,
            "mins_left": 410,
            "int_ref": "CITI-TZ-2359",
            "int_dir": "CREDIT",
            "ext_dir": "CREDIT",
            "plain": "Transaction logged at 23:58 UTC on 2026-10-25 recorded by Citi New York at 19:58 EDT on 2026-10-25. Internal calendar rolled to next day.",
            "rec_action": "Apply timezone normalization rule (+4h EST/EDT offset).",
            "assigned_to": "Auto-Reconciler (Tier 1)"
        },
        {
            "id": "EXP-8016",
            "category": "PENDING_REVERSAL",
            "severity": "HIGH",
            "bank_id": "DB",
            "amt": 410000.00,
            "curr": "EUR",
            "tier": 3,
            "sla_mins": 90,
            "mins_left": 35,
            "int_ref": "DB-REV-PEND-774",
            "int_dir": "CREDIT",
            "ext_dir": "DEBIT",
            "plain": "Counterparty bank recalled funds citing fraudulent origination. Reversal debit provisional on statement pending formal dispute resolution.",
            "rec_action": "Quarantine funds in escrow sub-account; notify Financial Crime Compliance.",
            "assigned_to": "Marcus Vance (Operations Lead)"
        },
        {
            "id": "EXP-8017",
            "category": "REGULATORY_HOLD",
            "severity": "CRITICAL",
            "bank_id": "HSBC",
            "amt": 820000.00,
            "curr": "EUR",
            "tier": 4,
            "sla_mins": 60,
            "mins_left": 22,
            "int_ref": "HSBC-OFAC-HOLD-01",
            "int_dir": "DEBIT",
            "ext_dir": "DEBIT",
            "plain": "Settlement payment stopped by HSBC Sanctions screening unit for secondary AML review. Funds frozen in clearing suspense account.",
            "rec_action": "Escalate to Chief Compliance Officer; provide beneficiary ownership certificates.",
            "assigned_to": "Compliance Oversight Group"
        },
        {
            "id": "EXP-8018",
            "category": "SETTLEMENT_DELAY",
            "severity": "MEDIUM",
            "bank_id": "BARC",
            "amt": 340000.00,
            "curr": "GBP",
            "tier": 2,
            "sla_mins": 360,
            "mins_left": 290,
            "int_ref": "BARC-DELAY-440",
            "int_dir": "CREDIT",
            "ext_dir": "CREDIT",
            "plain": "Bank of England real-time gross settlement (RTGS) window extended; settlement credit delayed beyond standard 17:00 London cut-off.",
            "rec_action": "Monitor overnight CHAPS queues; auto-settle upon day+1 ingestion feed.",
            "assigned_to": "Elena Rostova (Operations Specialist)"
        }
    ]

    for item in exceptions_catalog:
        # Create un-matched transaction in internal/external tables
        int_id = f"TXN-INT-{item['id']}"
        ext_id = f"TXN-EXT-{item['id']}"
        
        int_txn = Transaction(
            id=int_id,
            source="INTERNAL_LEDGER",
            bank_id=item["bank_id"],
            reference=item["int_ref"],
            amount=item["amt"],
            currency=item["curr"],
            direction=item["int_dir"],
            transaction_date="2026-10-25",
            value_date="2026-10-25",
            counterparty="Various Corporate Clients",
            narration=f"Booking for {item['int_ref']}",
            source_file="internal_general_ledger.csv",
            match_status="EXCEPTION",
            match_type="NONE",
            confidence_score=0.0,
            created_at=now - timedelta(hours=5)
        )
        db.add(int_txn)

        if item["category"] not in ["MISSING_INTERNAL_RECORD", "MISSING_EXTERNAL_RECORD"]:
            ext_txn = Transaction(
                id=ext_id,
                source="EXTERNAL_STATEMENT",
                bank_id=item["bank_id"],
                reference=item["int_ref"] if item["category"] != "REFERENCE_TRUNCATION" else item["int_ref"][:16],
                amount=item["amt"] if item["category"] != "AMOUNT_MISMATCH" else round(item["amt"] - 15420.50, 2),
                currency=item["curr"],
                direction=item["ext_dir"],
                transaction_date="2026-10-25",
                value_date="2026-10-25",
                counterparty="External Bank Counterparty",
                narration=f"Statement item for {item['int_ref']}",
                source_file=f"{item['bank_id']}_statement.csv",
                match_status="EXCEPTION",
                match_type="NONE",
                confidence_score=0.0,
                created_at=now - timedelta(hours=4)
            )
            db.add(ext_txn)

        exp = ExceptionRecord(
            id=item["id"],
            run_id="RUN-20261026-BASE",
            category=item["category"],
            severity=item["severity"],
            bank_id=item["bank_id"],
            internal_txn_id=int_id,
            external_txn_id=ext_id if item["category"] != "MISSING_EXTERNAL_RECORD" else None,
            discrepancy_amount=item["amt"],
            currency=item["curr"],
            plain_explanation=item["plain"],
            details_json=json.dumps({
                "internal_ref": item["int_ref"],
                "discrepancy": item["amt"],
                "sla_target_minutes": item["sla_mins"]
            }),
            status="OPEN",
            tier=item["tier"],
            sla_deadline=now + timedelta(minutes=item["mins_left"]),
            sla_minutes_total=item["sla_mins"],
            assigned_to=item["assigned_to"],
            recommended_action=item["rec_action"],
            created_at=now - timedelta(minutes=item["sla_mins"] - item["mins_left"])
        )
        db.add(exp)

    # 6. Past Reconciliation Runs
    runs_data = [
        {
            "id": "RUN-20261026-BASE",
            "run_number": "RUN-20261026-001",
            "bank_id": "ALL_BANKS",
            "date_from": "2026-10-25",
            "date_to": "2026-10-26",
            "currency": "MULTI",
            "rules_applied": json.dumps(["Exact_Ref", "Amount_Tol(0.02)", "Date_Tol(1d)", "Reversal_Shield", "18_Cat_Triage"]),
            "status": "COMPLETED_WITH_WARNINGS",
            "total_records": 12840,
            "matched_records": 12792,
            "unmatched_records": 48,
            "exceptions_count": 18,
            "match_rate": 99.63,
            "start_time": now - timedelta(hours=3),
            "end_time": now - timedelta(hours=3) + timedelta(seconds=14.8),
            "elapsed_seconds": 14.8,
            "pipeline_stages": json.dumps([
                {"stage_number": 1, "name": "Ingestion", "description": "Validated 12,840 ledger and statement entries across 5 bank feeds.", "status": "COMPLETED", "records_processed": 12840, "failures": 0, "elapsed_ms": 3200},
                {"stage_number": 2, "name": "Normalisation", "description": "Standardised UTR references, canonical ISO-8601 dates, and credit/debit signage.", "status": "COMPLETED", "records_processed": 12840, "failures": 0, "elapsed_ms": 2100},
                {"stage_number": 3, "name": "Matching", "description": "Pass 1 exact match (12,410), Pass 2 tolerance match (382).", "status": "COMPLETED", "records_processed": 12840, "failures": 0, "elapsed_ms": 7800},
                {"stage_number": 4, "name": "Exception Resolution", "description": "Triaged 48 unmatched items into 18 categories with automated SLA timers.", "status": "COMPLETED", "records_processed": 48, "failures": 0, "elapsed_ms": 1700}
            ]),
            "initiated_by": "scheduler_daemon"
        },
        {
            "id": "RUN-20261025-002",
            "run_number": "RUN-20261025-002",
            "bank_id": "JPMC",
            "date_from": "2026-10-24",
            "date_to": "2026-10-25",
            "currency": "USD",
            "rules_applied": json.dumps(["Exact_Ref", "Amount_Tol(0.02)"]),
            "status": "COMPLETED",
            "total_records": 8450,
            "matched_records": 8442,
            "unmatched_records": 8,
            "exceptions_count": 4,
            "match_rate": 99.91,
            "start_time": now - timedelta(days=1, hours=4),
            "end_time": now - timedelta(days=1, hours=4) + timedelta(seconds=8.2),
            "elapsed_seconds": 8.2,
            "pipeline_stages": json.dumps([
                {"stage_number": 1, "name": "Ingestion", "description": "JPMC CSV Statement parsed.", "status": "COMPLETED", "records_processed": 8450, "failures": 0, "elapsed_ms": 1900},
                {"stage_number": 2, "name": "Normalisation", "description": "Dates & sign normalisation.", "status": "COMPLETED", "records_processed": 8450, "failures": 0, "elapsed_ms": 1200},
                {"stage_number": 3, "name": "Matching", "description": "Exact multi-key matching completed.", "status": "COMPLETED", "records_processed": 8450, "failures": 0, "elapsed_ms": 4200},
                {"stage_number": 4, "name": "Exception Resolution", "description": "Auto-resolved 4 low-value fee items.", "status": "COMPLETED", "records_processed": 4, "failures": 0, "elapsed_ms": 900}
            ]),
            "initiated_by": "sarah.jenkins@reconops.internal"
        }
    ]
    for r in runs_data:
        db.add(ReconciliationRun(**r))

    # Commit transactions & runs first
    db.commit()

    # 7. Seed Initial Cryptographic Audit Trail
    print("Initializing tamper-evident SHA-256 audit log...")
    audit_events = [
        ("SYSTEM_BOOT", "SYSTEM", "ENGINE_INIT", "ENGINE", "System startup initialized with SHA-256 cryptographic chaining.", {"version": "1.0.0"}, {"status": "ONLINE"}),
        ("sarah.jenkins@reconops.internal", "ANALYST", "BANK_CONFIG_UPDATE", "JPMC", "Updated amount tolerance parameter from $0.01 to $0.02 for JPMC wire settlements.", {"tolerance": 0.01}, {"tolerance": 0.02}),
        ("system_scheduler", "SYSTEM", "TRIGGER_RECONCILIATION_RUN", "RUN-20261026-BASE", "Automated multi-bank daily settlement reconciliation run completed.", {"status": "SCHEDULED"}, {"status": "COMPLETED_WITH_WARNINGS"}),
        ("marcus.vance@reconops.internal", "ADMIN", "SLA_ESCALATION", "EXP-8001", "Escalated Direction Reversal on HSBC-REV-9921 to Tier 4 Compliance Queue.", {"tier": 2}, {"tier": 4}),
        ("liam.chen@reconops.internal", "ANALYST", "REVIEW_NOTE_ADDED", "EXP-8002", "Remittance confirmation email dispatched to Citadel Securities clearing desk.", {}, {"note": "Dispatched email to clearing desk"})
    ]

    for actor, role, action, entity_id, rationale, before, after in audit_events:
        record_audit(
            db=db,
            actor=actor,
            action=action,
            entity_type="SYSTEM",
            entity_id=entity_id,
            rationale=rationale,
            before_state=before,
            after_state=after
        )

    db.close()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed_database()
