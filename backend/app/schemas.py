from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

class VariantBase(BaseModel):
    product_id: int
    form: str
    container: str
    conversion_to_base: Optional[float] = None
    display_name_zh: str
    sort_order: Optional[int] = None

class VariantCreate(VariantBase):
    pass

class Variant(VariantBase):
    id: int
    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    name_zh: str
    name_en: str
    category: str
    storage_type: str
    supplier: Optional[str] = None
    case_pack: Optional[float] = None
    min_order_qty: Optional[float] = None
    sort_order: Optional[int] = None
    is_active: bool = True

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: int
    variants: List[Variant] = []
    class Config:
        from_attributes = True

class DailyCountCreate(BaseModel):
    date: str
    variant_id: int
    counted_qty: float

class DailyCount(DailyCountCreate):
    id: int
    created_at: datetime
    prev_on_hand: Optional[float] = None
    adjustment: Optional[float] = None
    class Config:
        from_attributes = True

class OrderLineBase(BaseModel):
    product_id: int
    suggested_qty: float
    final_qty: float
    unit: str
    reason_json: Optional[Any] = None
    notes: Optional[str] = None

class OrderLine(OrderLineBase):
    id: int
    product_name_zh: Optional[str] = None # Helper field
    loading_risk: Optional[bool] = None
    product_category: Optional[str] = None
    product_sort_order: Optional[int] = None
    class Config:
        from_attributes = True

class OrderBase(BaseModel):
    order_date: str
    order_type: str
    status: str

class OrderCreate(OrderBase):
    pass

class OrderCreateRequest(BaseModel):
    order: OrderCreate
    lines: List[OrderLineBase]

class Order(OrderBase):
    id: int
    created_at: datetime
    lines: List[OrderLine] = []
    class Config:
        from_attributes = True

class SettingsUpdate(BaseModel):
    lookback_days_for_usage: int
    safety_buffer_days: float
    cover_days_monday: float
    cover_days_friday: float
    cutoff_time: str
