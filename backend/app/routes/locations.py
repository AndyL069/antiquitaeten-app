# backend/app/routes/locations.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Location, Item, User
from app.schemas import LocationCreate, LocationUpdate, LocationResponse
from app.routes.auth import get_current_user

router = APIRouter(prefix="/api/locations", tags=["locations"])

@router.get("", response_model=List[LocationResponse])
def get_locations(
    flat: bool = Query(False, description="Return flat list instead of hierarchical tree"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return locations with item counts and hierarchical children tree."""
    locations = db.query(Location).order_by(Location.name.asc()).all()
    
    # Query item counts grouped by locationId
    counts = (
        db.query(Item.locationId, func.count(Item.id))
        .filter(Item.locationId.isnot(None))
        .group_by(Item.locationId)
        .all()
    )
    count_map = {loc_id: c for loc_id, c in counts}
    
    if flat:
        return [
            LocationResponse(
                id=loc.id,
                name=loc.name,
                description=loc.description,
                parentId=loc.parentId,
                createdAt=loc.createdAt,
                itemCount=count_map.get(loc.id, 0),
                children=[]
            )
            for loc in locations
        ]

    node_map = {}
    for loc in locations:
        node_map[loc.id] = LocationResponse(
            id=loc.id,
            name=loc.name,
            description=loc.description,
            parentId=loc.parentId,
            createdAt=loc.createdAt,
            itemCount=count_map.get(loc.id, 0),
            children=[]
        )

    roots = []
    for loc in locations:
        node = node_map[loc.id]
        if loc.parentId and loc.parentId in node_map and loc.parentId != loc.id:
            node_map[loc.parentId].children.append(node)
        else:
            roots.append(node)

    for node in node_map.values():
        node.children.sort(key=lambda x: x.name.lower())
    roots.sort(key=lambda x: x.name.lower())

    return roots

@router.post("", response_model=LocationResponse)
def create_location(
    data: LocationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new location."""
    name = data.name.strip() if data.name else ""
    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name fehlt"
        )

    parent_id = data.parentId.strip() if (data.parentId and data.parentId.strip()) else None
    if parent_id:
        parent = db.query(Location).filter(Location.id == parent_id).first()
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Übergeordneter Standort nicht gefunden"
            )

    desc = data.description.strip() if (data.description and data.description.strip()) else None
    location = Location(
        name=name,
        description=desc,
        parentId=parent_id
    )
    db.add(location)
    db.commit()
    db.refresh(location)

    return LocationResponse(
        id=location.id,
        name=location.name,
        description=location.description,
        parentId=location.parentId,
        createdAt=location.createdAt,
        itemCount=0,
        children=[]
    )

@router.get("/{id}", response_model=LocationResponse)
def get_location(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get location details by id."""
    loc = db.query(Location).filter(Location.id == id).first()
    if not loc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Standort nicht gefunden"
        )
    item_count = db.query(Item).filter(Item.locationId == id).count()
    return LocationResponse(
        id=loc.id,
        name=loc.name,
        description=loc.description,
        parentId=loc.parentId,
        createdAt=loc.createdAt,
        itemCount=item_count,
        children=[]
    )

@router.put("/{id}", response_model=LocationResponse)
@router.patch("/{id}", response_model=LocationResponse)
def update_location(
    id: str,
    data: LocationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update location name, description, or parentId."""
    loc = db.query(Location).filter(Location.id == id).first()
    if not loc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Standort nicht gefunden"
        )

    if data.parentId is not None and data.parentId == id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Standort kann nicht sich selbst übergeordnet sein"
        )

    if data.name is not None:
        name = data.name.strip()
        if not name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Name fehlt"
            )
        loc.name = name

    if data.description is not None:
        desc = data.description.strip()
        loc.description = desc if desc else None

    if data.parentId is not None:
        p_id = data.parentId.strip() if data.parentId.strip() else None
        if p_id:
            parent = db.query(Location).filter(Location.id == p_id).first()
            if not parent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Übergeordneter Standort nicht gefunden"
                )
            # Cycle prevention: verify p_id is not a descendant of id
            curr = parent
            while curr:
                if curr.id == id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Zyklische Standort-Hierarchie ist nicht erlaubt"
                    )
                curr = db.query(Location).filter(Location.id == curr.parentId).first() if curr.parentId else None
        loc.parentId = p_id

    db.commit()
    db.refresh(loc)

    item_count = db.query(Item).filter(Item.locationId == id).count()

    return LocationResponse(
        id=loc.id,
        name=loc.name,
        description=loc.description,
        parentId=loc.parentId,
        createdAt=loc.createdAt,
        itemCount=item_count,
        children=[]
    )

@router.delete("/{id}")
def delete_location(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete location and nullify children parentId and item locationId."""
    loc = db.query(Location).filter(Location.id == id).first()
    if not loc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Standort nicht gefunden"
        )

    # Set child items and child locations references to NULL
    db.query(Item).filter(Item.locationId == id).update({"locationId": None})
    db.query(Location).filter(Location.parentId == id).update({"parentId": None})
    db.delete(loc)
    db.commit()

    return {"ok": True}
