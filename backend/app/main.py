from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
from typing import List
from . import models, schemas, database, logic, seed, csv_export
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

models.Base.metadata.create_all(bind=database.engine)
database.ensure_schema()

app = FastAPI(title="M2GO Inventory", description="Backend for M2GO", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        # Auto-seed on first run (simplified for MVP)
        seed.seed_data(db)
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "M2GO Backend Running"}

@app.get("/products", response_model=List[schemas.Product])
def get_products(db: Session = Depends(get_db)):
    return db.query(models.Product).options(selectinload(models.Product.variants)).filter(models.Product.is_active == True).all()

@app.post("/products", response_model=schemas.Product, status_code=status.HTTP_201_CREATED)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    db_product = models.Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@app.put("/products/{product_id}", response_model=schemas.Product)
def update_product(product_id: int, product: schemas.ProductCreate, db: Session = Depends(get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")

    for key, value in product.model_dump().items():
        setattr(db_product, key, value)
    db.commit()
    db.refresh(db_product)
    return db_product

@app.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    db_product.is_active = False
    db.commit()
    return {"status": "ok"}

@app.post("/variants", response_model=schemas.Variant, status_code=status.HTTP_201_CREATED)
def create_variant(variant: schemas.VariantCreate, db: Session = Depends(get_db)):
    db_variant = models.Variant(**variant.model_dump())
    db.add(db_variant)
    db.commit()
    db.refresh(db_variant)
    return db_variant

@app.put("/variants/{variant_id}", response_model=schemas.Variant)
def update_variant(variant_id: int, variant: schemas.VariantCreate, db: Session = Depends(get_db)):
    db_variant = db.query(models.Variant).filter(models.Variant.id == variant_id).first()
    if not db_variant:
        raise HTTPException(status_code=404, detail="Variant not found")

    for key, value in variant.model_dump().items():
        setattr(db_variant, key, value)
    db.commit()
    db.refresh(db_variant)
    return db_variant

@app.delete("/variants/{variant_id}")
def delete_variant(variant_id: int, db: Session = Depends(get_db)):
    db_variant = db.query(models.Variant).filter(models.Variant.id == variant_id).first()
    if not db_variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    db.delete(db_variant)
    db.commit()
    return {"status": "ok"}

@app.post("/daily_counts", response_model=schemas.DailyCount)
def create_daily_count(count: schemas.DailyCountCreate, db: Session = Depends(get_db)):
    # 1. Load current balance for adjustment
    balance = db.query(models.InventoryBalance).filter_by(variant_id=count.variant_id).first()
    prev_on_hand = balance.on_hand if balance else 0.0
    adjustment = count.counted_qty - prev_on_hand

    # 1. Create DailyCount record
    db_count = models.DailyCount(
        **count.model_dump(),
        prev_on_hand=prev_on_hand,
        adjustment=adjustment
    )
    db.add(db_count)
    
    # 2. Update InventoryBalance
    if not balance:
        balance = models.InventoryBalance(variant_id=count.variant_id, on_hand=0.0)
        db.add(balance)
    
    # Store log / adjustment logic could go here more formally
    balance.on_hand = count.counted_qty
    
    db.commit()
    db.refresh(db_count)
    return db_count

@app.get("/orders/suggestion", response_model=List[schemas.OrderLine])
def get_order_suggestion(order_type: str = "MONDAY", db: Session = Depends(get_db)):
    # Generate suggestions in-memory (not saved to DB until confirmed, or saved as DRAFT?)
    # Prompt says "generate suggestions... save order".
    # We will return the calculated lines. Front-end can post them back to create order.
    # OR we create a Draft Order here.
    # Logic.py returns list of dicts.
    
    suggestions_data = logic.calculate_order_suggestion(db, order_type)
    # Convert to schema
    # Logic returns dicts matching OrderLineBase + extra
    return suggestions_data

@app.post("/orders", response_model=schemas.Order)
def create_order(payload: schemas.OrderCreateRequest, db: Session = Depends(get_db)):
    db_order = models.Order(**payload.order.model_dump())
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    
    for line in payload.lines:
        # Convert Pydantic model to dict, filtering out None or using defaults? 
        # Actually logic.py returned reason_json, but incoming from frontend might be simplified or passed through.
        line_data = line.model_dump()
        db_line = models.OrderLine(**line_data, order_id=db_order.id)
        db.add(db_line)
    
    db.commit()
    db.refresh(db_order)
    return db_order

@app.get("/orders/{order_id}/export")
def export_order_csv(order_id: int, db: Session = Depends(get_db)):
    try:
        csv_content = csv_export.generate_order_csv(db, order_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Order not found")

    filename = f"order_{order_id}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.get("/settings")
def get_settings(db: Session = Depends(get_db)):
    return db.query(models.Settings).all()

@app.put("/settings")
def update_settings(payload: schemas.SettingsUpdate, db: Session = Depends(get_db)):
    for key, value in payload.model_dump().items():
        setting = db.query(models.Settings).filter(models.Settings.key == key).first()
        if setting:
            setting.value = str(value)
        else:
            db.add(models.Settings(key=key, value=str(value)))
    db.commit()
    return {"status": "ok"}
