from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name_zh = Column(String, nullable=False)
    name_en = Column(String, nullable=False)
    category = Column(String, nullable=False) # protein/veg/frozen
    storage_type = Column(String, nullable=False) # room/chill/frozen
    supplier = Column(String, nullable=True)
    case_pack = Column(Float, nullable=True) # items per case, for rounding
    min_order_qty = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, nullable=True)

    variants = relationship("Variant", back_populates="product")

class Variant(Base):
    __tablename__ = "variants"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    form = Column(String, nullable=False) # RAW, COOKED_CHILL, PREP_chunk, etc.
    container = Column(String, nullable=False) # case, bag, box_2inch, box_4inch
    conversion_to_base = Column(Float, nullable=True) # how many base units in this container
    display_name_zh = Column(String, nullable=False)
    sort_order = Column(Integer, nullable=True)

    product = relationship("Product", back_populates="variants")
    daily_counts = relationship("DailyCount", back_populates="variant")
    inventory_balances = relationship("InventoryBalance", back_populates="variant")

class InventoryBalance(Base):
    __tablename__ = "inventory_balances"
    
    variant_id = Column(Integer, ForeignKey("variants.id"), primary_key=True)
    on_hand = Column(Float, default=0.0)
    
    variant = relationship("Variant", back_populates="inventory_balances")

class DailyCount(Base):
    __tablename__ = "daily_counts"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, nullable=False) # YYYY-MM-DD
    variant_id = Column(Integer, ForeignKey("variants.id"))
    counted_qty = Column(Float, nullable=False)
    prev_on_hand = Column(Float, nullable=True)
    adjustment = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    variant = relationship("Variant", back_populates="daily_counts")

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_date = Column(String, nullable=False)
    order_type = Column(String, nullable=False) # MONDAY or FRIDAY
    status = Column(String, default="DRAFT") # DRAFT, CONFIRMED
    created_at = Column(DateTime, default=datetime.now)

    lines = relationship("OrderLine", back_populates="order")

class OrderLine(Base):
    __tablename__ = "order_lines"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    suggested_qty = Column(Float, default=0.0)
    final_qty = Column(Float, default=0.0)
    unit = Column(String, nullable=False)
    reason_json = Column(JSON, nullable=True)
    notes = Column(String, nullable=True)

    order = relationship("Order", back_populates="lines")
    product = relationship("Product")

class Settings(Base):
    __tablename__ = "settings"
    
    key = Column(String, primary_key=True)
    value = Column(String, nullable=False)
