# backend/app/schemas.py
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, EmailStr, Field

# ==========================================
# User & Auth Schemas
# ==========================================

class UserBase(BaseModel):
    email: str
    name: Optional[str] = None

class UserRegister(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(UserBase):
    id: str
    role: str
    authProvider: str
    createdAt: datetime

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Optional[UserResponse] = None

class TokenData(BaseModel):
    sub: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None

class AuthProvidersResponse(BaseModel):
    authentik: bool

class UserRoleUpdate(BaseModel):
    role: str

# ==========================================
# Location Schemas
# ==========================================

class LocationBase(BaseModel):
    name: str
    description: Optional[str] = None
    parentId: Optional[str] = None

class LocationCreate(LocationBase):
    pass

class LocationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parentId: Optional[str] = None

class LocationResponse(LocationBase):
    id: str
    createdAt: datetime
    itemCount: Optional[int] = 0
    children: List["LocationResponse"] = []

    model_config = ConfigDict(from_attributes=True)

# ==========================================
# Photo Schemas
# ==========================================

class PhotoBase(BaseModel):
    path: str
    caption: Optional[str] = None
    isPrimary: bool = False

class PhotoCreate(PhotoBase):
    pass

class PhotoResponse(PhotoBase):
    id: str
    itemId: str
    createdAt: datetime

    model_config = ConfigDict(from_attributes=True)

# ==========================================
# Appraisal Schemas
# ==========================================

class AppraisalBase(BaseModel):
    value: float
    currency: str = "EUR"
    appraisalDate: Optional[datetime] = None
    appraiser: Optional[str] = None
    note: Optional[str] = None

class AppraisalCreate(AppraisalBase):
    pass

class AppraisalResponse(AppraisalBase):
    id: str
    itemId: str
    createdAt: datetime

    model_config = ConfigDict(from_attributes=True)

# ==========================================
# Sale Schemas
# ==========================================

class SaleBase(BaseModel):
    platform: str
    amount: float
    currency: str = "EUR"
    soldAt: Optional[datetime] = None
    note: Optional[str] = None

class SaleCreate(SaleBase):
    pass

class SaleResponse(SaleBase):
    id: str
    itemId: str
    createdAt: datetime

    model_config = ConfigDict(from_attributes=True)

# ==========================================
# Item Schemas
# ==========================================

class ItemBase(BaseModel):
    name: str
    inventoryNumber: Optional[str] = None
    category: Optional[str] = None
    era: Optional[str] = None
    origin: Optional[str] = None
    material: Optional[str] = None
    dimensions: Optional[str] = None
    condition: Optional[str] = None
    description: Optional[str] = None
    context: Optional[str] = None
    author: Optional[str] = None
    publisher: Optional[str] = None
    publicationYear: Optional[str] = None
    edition: Optional[str] = None
    language: Optional[str] = None
    weight: Optional[str] = None
    ebayTitle: Optional[str] = None
    ebayCategory: Optional[str] = None
    ebayCondition: Optional[str] = None
    ebayConditionNote: Optional[str] = None
    startPrice: Optional[float] = None
    buyItNowPrice: Optional[float] = None
    acquisitionDate: Optional[datetime] = None
    acquisitionNote: Optional[str] = None
    searchText: Optional[str] = None
    locationId: Optional[str] = None

class ItemCreate(ItemBase):
    pass

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    inventoryNumber: Optional[str] = None
    category: Optional[str] = None
    era: Optional[str] = None
    origin: Optional[str] = None
    material: Optional[str] = None
    dimensions: Optional[str] = None
    condition: Optional[str] = None
    description: Optional[str] = None
    context: Optional[str] = None
    author: Optional[str] = None
    publisher: Optional[str] = None
    publicationYear: Optional[str] = None
    edition: Optional[str] = None
    language: Optional[str] = None
    weight: Optional[str] = None
    ebayTitle: Optional[str] = None
    ebayCategory: Optional[str] = None
    ebayCondition: Optional[str] = None
    ebayConditionNote: Optional[str] = None
    startPrice: Optional[float] = None
    buyItNowPrice: Optional[float] = None
    acquisitionDate: Optional[datetime] = None
    acquisitionNote: Optional[str] = None
    searchText: Optional[str] = None
    locationId: Optional[str] = None

class ItemResponse(ItemBase):
    id: str
    createdById: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime
    photos: List[PhotoResponse] = []
    appraisals: List[AppraisalResponse] = []
    sales: List[SaleResponse] = []
    location: Optional[LocationResponse] = None
    createdBy: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)
