# backend/app/routes/items.py
import base64
import re
import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from app.config import settings
from app.database import get_db
from app.models import Item, Photo, Location, User
from app.schemas import (
    ItemCreate,
    ItemUpdate,
    ItemResponse,
    PhotoResponse,
)
from app.routes.auth import get_current_user
from app.services import gemini_service
from app.services.gemini_service import ItemDetailsAnalysis

router = APIRouter(tags=["items"])


def build_search_text(data: dict) -> str:
    """Build space/delimiter-separated search text index for item fields."""
    fields = [
        data.get("inventoryNumber"),
        data.get("name"),
        data.get("category"),
        data.get("era"),
        data.get("origin"),
        data.get("material"),
        data.get("description"),
        data.get("context"),
        data.get("author"),
        data.get("publisher"),
        data.get("publicationYear"),
        data.get("ebayTitle"),
    ]
    return " \u0001 ".join(str(f).strip() for f in fields if f and str(f).strip())


def generate_next_inventory_number(db: Session, prefix: str = "INV-") -> str:
    """Find highest numeric suffix in existing inventory numbers and return next."""
    items = db.query(Item.inventoryNumber).filter(Item.inventoryNumber.isnot(None)).all()
    max_num = 0
    pattern = re.compile(r"(\d+)\s*$")
    for (inv_num,) in items:
        if inv_num:
            m = pattern.search(inv_num)
            if m:
                try:
                    num = int(m.group(1))
                    if num > max_num:
                        max_num = num
                except ValueError:
                    pass
    return f"{prefix}{max_num + 1:04d}"


# ==========================================
# Items CRUD & Search
# ==========================================

@router.get("/api/items", response_model=List[ItemResponse])
def get_items(
    q: Optional[str] = Query(None, description="Search term across name, description, context, era, material, inventoryNumber"),
    category: Optional[str] = Query(None, description="Filter by category"),
    condition: Optional[str] = Query(None, description="Filter by condition"),
    era: Optional[str] = Query(None, description="Filter by era"),
    locationId: Optional[str] = Query(None, description="Filter by location ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List items with optional filters and text search, sorted newest first."""
    query = (
        db.query(Item)
        .options(
            joinedload(Item.location),
            joinedload(Item.photos),
            joinedload(Item.appraisals),
            joinedload(Item.sales),
            joinedload(Item.createdBy),
        )
    )

    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Item.name.ilike(term),
                Item.description.ilike(term),
                Item.context.ilike(term),
                Item.era.ilike(term),
                Item.material.ilike(term),
                Item.inventoryNumber.ilike(term),
                Item.searchText.ilike(term),
            )
        )

    if category and category.strip():
        query = query.filter(Item.category.ilike(category.strip()))

    if condition and condition.strip():
        query = query.filter(Item.condition.ilike(condition.strip()))

    if era and era.strip():
        query = query.filter(Item.era.ilike(era.strip()))

    if locationId and locationId.strip():
        query = query.filter(Item.locationId == locationId.strip())

    items = query.order_by(Item.createdAt.desc()).all()
    return items


@router.post("/api/items", response_model=ItemResponse)
def create_item(
    data: ItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new antique item, computing searchText and assigning inventoryNumber."""
    name = data.name.strip() if data.name else ""
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name fehlt"
        )

    item_dict = data.model_dump()

    # Handle inventory number
    inv_num = item_dict.get("inventoryNumber")
    if inv_num and str(inv_num).strip():
        inv_num = str(inv_num).strip()
        existing = db.query(Item).filter(Item.inventoryNumber == inv_num).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Inventarnummer ist bereits vergeben"
            )
        item_dict["inventoryNumber"] = inv_num
    else:
        item_dict["inventoryNumber"] = generate_next_inventory_number(db)

    # Compute search text index
    item_dict["searchText"] = build_search_text(item_dict)
    item_dict["createdById"] = current_user.id

    new_item = Item(**item_dict)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item


# ==========================================
# Multimodal AI Image Analysis
# (Must be registered before /api/items/{id})
# ==========================================

@router.post("/api/items/analyze", response_model=ItemDetailsAnalysis)
async def analyze_item_images(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Analyze item photos with Gemini Vision to extract antique item details."""
    content_type = request.headers.get("content-type", "")
    images: list[tuple[bytes, str]] = []

    if "multipart/form-data" in content_type:
        form = await request.form()
        for field_name in ["photo", "photos", "files", "images", "file"]:
            for item in form.getlist(field_name):
                if hasattr(item, "read"):
                    data = await item.read()
                    ct = getattr(item, "content_type", "image/jpeg") or "image/jpeg"
                    if data:
                        images.append((data, ct))
        if not images:
            for _, val in form.items():
                if hasattr(val, "read"):
                    data = await val.read()
                    ct = getattr(val, "content_type", "image/jpeg") or "image/jpeg"
                    if data:
                        images.append((data, ct))
    elif "application/json" in content_type:
        body = await request.json()
        raw_list = []
        if isinstance(body, list):
            raw_list = body
        elif isinstance(body, dict):
            raw_list = body.get("images") or body.get("photos") or []

        for item in raw_list:
            if isinstance(item, str):
                b64_data = item
                mime = "image/jpeg"
                if b64_data.startswith("data:") and ";base64," in b64_data:
                    header, b64_data = b64_data.split(";base64,", 1)
                    mime = header.replace("data:", "")
                try:
                    data = base64.b64decode(b64_data)
                    images.append((data, mime))
                except Exception:
                    pass
            elif isinstance(item, dict):
                b64_data = item.get("base64") or item.get("data") or ""
                mime = item.get("mimeType") or "image/jpeg"
                if b64_data.startswith("data:") and ";base64," in b64_data:
                    header, b64_data = b64_data.split(";base64,", 1)
                    mime = header.replace("data:", "")
                try:
                    data = base64.b64decode(b64_data)
                    images.append((data, mime))
                except Exception:
                    pass

    if not images:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Keine Bilder zur Analyse übergeben"
        )

    return gemini_service.extract_item_details_from_images(images)


# ==========================================
# Item Detail, Update & Delete
# ==========================================

@router.get("/api/items/{id}", response_model=ItemResponse)
def get_item(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get single item with all relations."""
    item = (
        db.query(Item)
        .options(
            joinedload(Item.location),
            joinedload(Item.photos),
            joinedload(Item.appraisals),
            joinedload(Item.sales),
            joinedload(Item.createdBy),
        )
        .filter(Item.id == id)
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Objekt nicht gefunden"
        )
    return item


@router.put("/api/items/{id}", response_model=ItemResponse)
@router.patch("/api/items/{id}", response_model=ItemResponse)
def update_item(
    id: str,
    data: ItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update item fields and recompute searchText."""
    item = db.query(Item).filter(Item.id == id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Objekt nicht gefunden"
        )

    update_dict = data.model_dump(exclude_unset=True)

    if "name" in update_dict:
        name = update_dict["name"].strip() if update_dict["name"] else ""
        if not name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Name darf nicht leer sein"
            )
        update_dict["name"] = name

    if "inventoryNumber" in update_dict and update_dict["inventoryNumber"]:
        new_inv = str(update_dict["inventoryNumber"]).strip()
        existing = db.query(Item).filter(Item.inventoryNumber == new_inv, Item.id != id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Inventarnummer ist bereits vergeben"
            )
        update_dict["inventoryNumber"] = new_inv

    for key, val in update_dict.items():
        setattr(item, key, val)

    # Recompute searchText
    current_dict = {c.name: getattr(item, c.name) for c in item.__table__.columns}
    item.searchText = build_search_text(current_dict)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/api/items/{id}")
def delete_item(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete item, its photo files on disk, and cascading database relations."""
    item = db.query(Item).filter(Item.id == id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Objekt nicht gefunden"
        )

    # Remove photo files from uploads directory
    for photo in item.photos:
        filename = Path(photo.path).name
        filepath = settings.UPLOADS_DIR / filename
        if filepath.exists() and filepath.is_file():
            try:
                filepath.unlink()
            except OSError:
                pass

    db.delete(item)
    db.commit()
    return {"ok": True}


# ==========================================
# Item Photos Management
# ==========================================

@router.post("/api/items/{id}/photos", response_model=PhotoResponse)
async def upload_item_photo(
    id: str,
    photo: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None),
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload photo for item, save to UPLOADS_DIR with UUID filename, and set primary if first."""
    item = db.query(Item).filter(Item.id == id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Objekt nicht gefunden"
        )

    upload = photo or file
    if upload is None and request:
        form = await request.form()
        for f in form.values():
            if hasattr(f, "read"):
                upload = f
                break

    if upload is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Keine Bilddatei übermittelt"
        )

    contents = await upload.read()
    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Leere Bilddatei übermittelt"
        )

    # Determine file extension
    ext = Path(upload.filename or "").suffix.lower()
    if not ext or ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        ext = ".jpg"

    filename = f"{uuid.uuid4().hex}{ext}"
    settings.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    target_path = settings.UPLOADS_DIR / filename
    with open(target_path, "wb") as f_out:
        f_out.write(contents)

    existing_photos_count = db.query(Photo).filter(Photo.itemId == id).count()
    is_primary = existing_photos_count == 0

    new_photo = Photo(
        itemId=id,
        path=f"/uploads/{filename}",
        isPrimary=is_primary
    )
    db.add(new_photo)
    db.commit()
    db.refresh(new_photo)
    return new_photo


@router.put("/api/photos/{id}/primary", response_model=PhotoResponse)
@router.patch("/api/photos/{id}/primary", response_model=PhotoResponse)
@router.patch("/api/photos/{id}", response_model=PhotoResponse)
def set_primary_photo(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Set photo as primary for its item and unset primary on other item photos."""
    target_photo = db.query(Photo).filter(Photo.id == id).first()
    if not target_photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Foto nicht gefunden"
        )

    # Set all photos of this item to isPrimary=False
    db.query(Photo).filter(Photo.itemId == target_photo.itemId).update({"isPrimary": False})
    target_photo.isPrimary = True
    db.commit()
    db.refresh(target_photo)
    return target_photo


@router.delete("/api/photos/{id}")
def delete_photo(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete photo from database and filesystem. If was primary, designate next photo as primary."""
    photo = db.query(Photo).filter(Photo.id == id).first()
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Foto nicht gefunden"
        )

    item_id = photo.itemId
    was_primary = photo.isPrimary

    # Delete physical file
    filename = Path(photo.path).name
    filepath = settings.UPLOADS_DIR / filename
    if filepath.exists() and filepath.is_file():
        try:
            filepath.unlink()
        except OSError:
            pass

    db.delete(photo)
    db.commit()

    # If the deleted photo was primary, make the next photo primary
    if was_primary:
        next_photo = db.query(Photo).filter(Photo.itemId == item_id).order_by(Photo.createdAt.asc()).first()
        if next_photo:
            next_photo.isPrimary = True
            db.commit()

    return {"ok": True}
