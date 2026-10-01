# backend/app/models.py
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "User"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=True)
    passwordHash = Column(String, nullable=False)
    role = Column(String, default="MEMBER")  # "ADMIN", "MEMBER"
    authProvider = Column(String, default="credentials")
    createdAt = Column(DateTime, default=datetime.utcnow)
    
    items = relationship("Item", back_populates="createdBy", foreign_keys="Item.createdById")

class Location(Base):
    __tablename__ = "Location"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    parentId = Column(String, ForeignKey("Location.id", ondelete="SET NULL"), nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow)
    
    parent = relationship("Location", remote_side=[id], back_populates="children")
    children = relationship("Location", back_populates="parent")
    items = relationship("Item", back_populates="location")

class Item(Base):
    __tablename__ = "Item"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    inventoryNumber = Column(String, unique=True, nullable=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=True)
    era = Column(String, nullable=True)
    origin = Column(String, nullable=True)
    material = Column(String, nullable=True)
    dimensions = Column(String, nullable=True)
    condition = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    context = Column(Text, nullable=True)
    author = Column(String, nullable=True)
    publisher = Column(String, nullable=True)
    publicationYear = Column(String, nullable=True)
    edition = Column(String, nullable=True)
    language = Column(String, nullable=True)
    weight = Column(String, nullable=True)
    ebayTitle = Column(String, nullable=True)
    ebayCategory = Column(String, nullable=True)
    ebayCondition = Column(String, nullable=True)
    ebayConditionNote = Column(String, nullable=True)
    startPrice = Column(Float, nullable=True)
    buyItNowPrice = Column(Float, nullable=True)
    acquisitionDate = Column(DateTime, nullable=True)
    acquisitionNote = Column(String, nullable=True)
    searchText = Column(Text, default="")
    locationId = Column(String, ForeignKey("Location.id", ondelete="SET NULL"), nullable=True, index=True)
    createdById = Column(String, ForeignKey("User.id", ondelete="SET NULL"), nullable=True, index=True)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    location = relationship("Location", back_populates="items")
    createdBy = relationship("User", back_populates="items")
    photos = relationship("Photo", back_populates="item", cascade="all, delete-orphan")
    appraisals = relationship("Appraisal", back_populates="item", cascade="all, delete-orphan")
    sales = relationship("Sale", back_populates="item", cascade="all, delete-orphan")

class Photo(Base):
    __tablename__ = "Photo"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    itemId = Column(String, ForeignKey("Item.id", ondelete="CASCADE"), nullable=False, index=True)
    path = Column(String, nullable=False)
    caption = Column(String, nullable=True)
    isPrimary = Column(Boolean, default=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    
    item = relationship("Item", back_populates="photos")

class Appraisal(Base):
    __tablename__ = "Appraisal"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    itemId = Column(String, ForeignKey("Item.id", ondelete="CASCADE"), nullable=False, index=True)
    value = Column(Float, nullable=False)
    currency = Column(String, default="EUR")
    appraisalDate = Column(DateTime, nullable=True)
    appraiser = Column(String, nullable=True)
    note = Column(String, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow)
    
    item = relationship("Item", back_populates="appraisals")

class Sale(Base):
    __tablename__ = "Sale"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    itemId = Column(String, ForeignKey("Item.id", ondelete="CASCADE"), nullable=False, index=True)
    platform = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="EUR")
    soldAt = Column(DateTime, nullable=True)
    note = Column(String, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow)
    
    item = relationship("Item", back_populates="sales")
