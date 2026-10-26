from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from backend.app.core.database import get_db
from backend.app.models.models import Transaction, ExceptionRecord

router = APIRouter(prefix="/api/v1/transactions", tags=["Transactions"])

@router.get("")
def list_transactions(
    source: Optional[str] = Query(None, description="INTERNAL_LEDGER or EXTERNAL_STATEMENT"),
    bank_id: Optional[str] = Query(None),
    match_status: Optional[str] = Query(None),
    match_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(Transaction)

    if source:
        query = query.filter(Transaction.source == source)
    if bank_id and bank_id != "ALL":
        query = query.filter(Transaction.bank_id == bank_id)
    if match_status and match_status != "ALL":
        query = query.filter(Transaction.match_status == match_status)
    if match_type and match_type != "ALL":
        query = query.filter(Transaction.match_type == match_type)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Transaction.reference.ilike(search_filter)) |
            (Transaction.counterparty.ilike(search_filter)) |
            (Transaction.narration.ilike(search_filter)) |
            (Transaction.id.ilike(search_filter))
        )

    total_count = query.count()
    items = query.order_by(Transaction.transaction_date.desc(), Transaction.id.asc()).offset(offset).limit(limit).all()

    return {
        "total": total_count,
        "offset": offset,
        "limit": limit,
        "items": [t.to_dict() for t in items]
    }

@router.get("/{txn_id}/compare")
def compare_transactions(txn_id: str, db: Session = Depends(get_db)):
    target = db.query(Transaction).filter(Transaction.id == txn_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # If it has a matched transaction id, fetch that
    matched_txn = None
    if target.matched_transaction_id:
        matched_txn = db.query(Transaction).filter(Transaction.id == target.matched_transaction_id).first()
    
    # If not matched, try finding the closest candidate
    candidate_matches = []
    if not matched_txn:
        other_source = "EXTERNAL_STATEMENT" if target.source == "INTERNAL_LEDGER" else "INTERNAL_LEDGER"
        candidates = db.query(Transaction).filter(
            Transaction.source == other_source,
            Transaction.bank_id == target.bank_id,
            Transaction.currency == target.currency
        ).limit(10).all()

        for c in candidates:
            # Score similarity
            score = 0.0
            reasons = []
            if c.reference.upper() == target.reference.upper():
                score += 0.50
                reasons.append("Exact reference match")
            elif target.reference.upper() in c.reference.upper() or c.reference.upper() in target.reference.upper():
                score += 0.30
                reasons.append("Partial reference match")

            amt_diff = abs(c.amount - target.amount)
            if amt_diff == 0:
                score += 0.30
                reasons.append("Exact amount match")
            elif amt_diff <= 1.0:
                score += 0.20
                reasons.append(f"Minor amount diff (${amt_diff:.2f})")

            if c.direction == target.direction:
                score += 0.15
                reasons.append("Same direction")
            else:
                reasons.append("Direction reversal warning")

            if c.transaction_date == target.transaction_date:
                score += 0.05
                reasons.append("Identical date")

            candidate_matches.append({
                "transaction": c.to_dict(),
                "confidence_score": round(min(score, 0.99), 2),
                "scoring_factors": reasons
            })

        candidate_matches.sort(key=lambda x: x["confidence_score"], reverse=True)
        if candidate_matches and candidate_matches[0]["confidence_score"] > 0.4:
            matched_candidate_id = candidate_matches[0]["transaction"]["id"]
            matched_txn = db.query(Transaction).filter(Transaction.id == matched_candidate_id).first()

    # Determine internal and external sides
    if target.source == "INTERNAL_LEDGER":
        internal_record = target.to_dict()
        external_record = matched_txn.to_dict() if matched_txn else None
    else:
        internal_record = matched_txn.to_dict() if matched_txn else None
        external_record = target.to_dict()

    # Field by field comparison
    diff_analysis = {}
    if internal_record and external_record:
        diff_analysis = {
            "reference": {
                "internal": internal_record["reference"],
                "external": external_record["reference"],
                "match": internal_record["reference"].strip().upper() == external_record["reference"].strip().upper()
            },
            "amount": {
                "internal": internal_record["amount"],
                "external": external_record["amount"],
                "difference": round(abs(internal_record["amount"] - external_record["amount"]), 2),
                "match": internal_record["amount"] == external_record["amount"]
            },
            "currency": {
                "internal": internal_record["currency"],
                "external": external_record["currency"],
                "match": internal_record["currency"] == external_record["currency"]
            },
            "direction": {
                "internal": internal_record["direction"],
                "external": external_record["direction"],
                "match": internal_record["direction"] == external_record["direction"]
            },
            "transaction_date": {
                "internal": internal_record["transaction_date"],
                "external": external_record["transaction_date"],
                "match": internal_record["transaction_date"] == external_record["transaction_date"]
            },
            "counterparty": {
                "internal": internal_record["counterparty"],
                "external": external_record["counterparty"],
                "match": internal_record["counterparty"].strip().upper() == external_record["counterparty"].strip().upper()
            }
        }

    return {
        "transaction_id": target.id,
        "match_status": target.match_status,
        "match_type": target.match_type,
        "confidence_score": target.confidence_score,
        "match_explanation": target.match_explanation,
        "internal_record": internal_record,
        "external_record": external_record,
        "diff_analysis": diff_analysis,
        "candidates": candidate_matches[:5]
    }
