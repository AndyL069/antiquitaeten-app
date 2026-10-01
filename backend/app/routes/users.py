# backend/app/routes/users.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import UserResponse, UserRoleUpdate
from app.routes.auth import require_admin

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("", response_model=List[UserResponse])
def get_users(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """List all registered users (admin-only)."""
    return db.query(User).order_by(User.createdAt.asc()).all()

@router.put("/{id}/role", response_model=UserResponse)
@router.patch("/{id}", response_model=UserResponse)
@router.put("/{id}", response_model=UserResponse)
def update_user_role(
    id: str,
    data: UserRoleUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update a user's role (ADMIN or MEMBER). Cannot demote self or remove the last admin."""
    target = db.query(User).filter(User.id == id).first()
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Benutzer nicht gefunden"
        )

    role = data.role.strip().upper()
    if role not in ["ADMIN", "MEMBER"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ungültige Rolle. Erlaubt sind 'ADMIN' oder 'MEMBER'."
        )

    if id == admin.id and role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sie können sich nicht selbst zum Mitglied herabstufen"
        )

    if target.role == "ADMIN" and role == "MEMBER":
        admin_count = db.query(User).filter(User.role == "ADMIN").count()
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Es muss mindestens ein Administrator übrig bleiben"
            )

    target.role = role
    db.commit()
    db.refresh(target)
    return target

@router.delete("/{id}")
def delete_user(
    id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete a user. Cannot delete self or the last remaining administrator."""
    target = db.query(User).filter(User.id == id).first()
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Benutzer nicht gefunden"
        )

    if id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sie können sich nicht selbst löschen"
        )

    if target.role == "ADMIN":
        admin_count = db.query(User).filter(User.role == "ADMIN").count()
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Es muss mindestens ein Administrator übrig bleiben"
            )

    db.delete(target)
    db.commit()
    return {"ok": True}
