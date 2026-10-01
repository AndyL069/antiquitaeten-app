import uuid
from app.database import Base, engine, SessionLocal
from app.models import User, Location, Item, Photo, Appraisal, Sale

def test_models_creation_and_relations():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user = User(
            id=str(uuid.uuid4()),
            email="test@antik.de",
            name="Test User",
            passwordHash="hash123",
            role="ADMIN"
        )
        db.add(user)
        
        loc = Location(id=str(uuid.uuid4()), name="Wohnzimmer")
        db.add(loc)
        
        item = Item(
            id=str(uuid.uuid4()),
            inventoryNumber="ANT-001",
            name="Alte Standuhr",
            category="Uhren",
            locationId=loc.id,
            createdById=user.id
        )
        db.add(item)
        
        photo = Photo(id=str(uuid.uuid4()), itemId=item.id, path="/uploads/photo1.jpg", isPrimary=True)
        appraisal = Appraisal(id=str(uuid.uuid4()), itemId=item.id, value=450.0)
        sale = Sale(id=str(uuid.uuid4()), itemId=item.id, platform="eBay", amount=500.0)
        
        db.add_all([photo, appraisal, sale])
        db.commit()
        
        fetched = db.query(Item).filter_by(inventoryNumber="ANT-001").first()
        assert fetched is not None
        assert fetched.name == "Alte Standuhr"
        assert len(fetched.photos) == 1
        assert len(fetched.appraisals) == 1
        assert len(fetched.sales) == 1
        assert fetched.location.name == "Wohnzimmer"
        assert fetched.createdBy.name == "Test User"
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

def test_location_tree_and_cascades():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        parent_loc = Location(name="Hauptlager")
        db.add(parent_loc)
        db.commit()

        child_loc = Location(name="Regal 1", parentId=parent_loc.id)
        db.add(child_loc)
        db.commit()

        db.refresh(parent_loc)
        assert len(parent_loc.children) == 1
        assert parent_loc.children[0].name == "Regal 1"
        assert child_loc.parent.name == "Hauptlager"

        item = Item(name="Test Item", locationId=child_loc.id)
        db.add(item)
        db.commit()

        photo = Photo(itemId=item.id, path="/test.jpg")
        appraisal = Appraisal(itemId=item.id, value=100.0)
        sale = Sale(itemId=item.id, platform="Shop", amount=120.0)
        db.add_all([photo, appraisal, sale])
        db.commit()

        db.delete(item)
        db.commit()

        assert db.query(Photo).filter_by(itemId=item.id).count() == 0
        assert db.query(Appraisal).filter_by(itemId=item.id).count() == 0
        assert db.query(Sale).filter_by(itemId=item.id).count() == 0
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
