# backend/app/routes/appraisals.py
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Appraisal, Item, User
from app.schemas import AppraisalCreate, AppraisalResponse
from app.routes.auth import get_current_user

router = APIRouter(tags=["appraisals"])

@router.post("/api/items/{id}/appraisals", response_model=AppraisalResponse)
def add_item_appraisal(
    id: str,
    data: AppraisalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add appraisal to a specific item."""
    item = db.query(Item).filter(Item.id == id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Objekt nicht gefunden"
        )

    appraisal = Appraisal(
        itemId=id,
        value=data.value,
        currency=data.currency.strip().upper() if data.currency else "EUR",
        appraisalDate=data.appraisalDate,
        appraiser=data.appraiser.strip() if data.appraiser else None,
        note=data.note.strip() if data.note else None
    )
    db.add(appraisal)
    db.commit()
    db.refresh(appraisal)
    return appraisal

@router.post("/api/appraisals", response_model=AppraisalResponse)
def create_appraisal_legacy(
    data: AppraisalCreate,
    itemId: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add appraisal (flat endpoint for legacy compatibility)."""
    target_item_id = itemId or getattr(data, "itemId", None)
    if not target_item_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Objekt fehlt"
        )
    return add_item_appraisal(id=target_item_id, data=data, current_user=current_user, db=db)

@router.delete("/api/appraisals/{id}")
def delete_appraisal(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete appraisal by id."""
    appraisal = db.query(Appraisal).filter(Appraisal.id == id).first()
    if not appraisal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wertgutachten nicht gefunden"
        )
    db.delete(appraisal)
    db.commit()
    return {"ok": True}
