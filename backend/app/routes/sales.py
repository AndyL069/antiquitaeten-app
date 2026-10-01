# backend/app/routes/sales.py
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Sale, Item, User
from app.schemas import SaleCreate, SaleResponse
from app.routes.auth import get_current_user

router = APIRouter(tags=["sales"])

@router.post("/api/items/{id}/sales", response_model=SaleResponse)
def add_item_sale(
    id: str,
    data: SaleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a sale record to a specific item."""
    item = db.query(Item).filter(Item.id == id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Objekt nicht gefunden"
        )

    platform = data.platform.strip() if data.platform else ""
    if not platform:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verkaufsplattform fehlt"
        )

    sale = Sale(
        itemId=id,
        platform=platform,
        amount=data.amount,
        currency=data.currency.strip().upper() if data.currency else "EUR",
        soldAt=data.soldAt,
        note=data.note.strip() if data.note else None
    )
    db.add(sale)
    db.commit()
    db.refresh(sale)
    return sale

@router.post("/api/sales", response_model=SaleResponse)
def create_sale_legacy(
    data: SaleCreate,
    itemId: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add sale record (flat endpoint for legacy compatibility)."""
    target_item_id = itemId or getattr(data, "itemId", None)
    if not target_item_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Objekt fehlt"
        )
    return add_item_sale(id=target_item_id, data=data, current_user=current_user, db=db)

@router.delete("/api/sales/{id}")
def delete_sale(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a sale record by id."""
    sale = db.query(Sale).filter(Sale.id == id).first()
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verkauf nicht gefunden"
        )
    db.delete(sale)
    db.commit()
    return {"ok": True}
