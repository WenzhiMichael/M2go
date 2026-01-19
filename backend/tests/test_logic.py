import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app import models, logic, schemas, csv_export
from app.database import Base
from datetime import datetime, timedelta

# In-memory DB for tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def add_settings(db, cover_days="4", safety_buffer="0", lookback_days="14"):
    db.add(models.Settings(key="lookback_days_for_usage", value=lookback_days))
    db.add(models.Settings(key="cover_days_monday", value=cover_days))
    db.add(models.Settings(key="safety_buffer_days", value=safety_buffer))
    db.commit()

@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

def test_protein_case_rounding(db):
    # 1. Setup Protein Product
    p = models.Product(name_zh="Test Chicken", name_en="Test Chk", category="protein", storage_type="chill", case_pack=10.0)
    db.add(p)
    db.commit()
    
    # Variant: Case (Base Unit = 10 portion/bag? No, here Case is CONTAINER. Conversion to base = 10)
    # Let's say we order by Case.
    v = models.Variant(product_id=p.id, form="RAW", container="case", display_name_zh="Test-Case", conversion_to_base=10.0)
    db.add(v)
    db.commit()
    
    # 2. Mock Usage: Need 12 units.
    # Current Stock = 0.
    # Daily Demand = 3 units/day.
    # Cover Days = 4. Target = 12 + buffer.
    # Let's mock logic.estimate_usage to return fixed value, OR inject DailyCounts.
    
    # Inject DailyCounts
    # Day 1: 100 on hand
    # Day 2: 97 on hand (Usage 3)
    # Day 3: 94 on hand (Usage 3)
    today = datetime.now()
    dates = [today - timedelta(days=i) for i in range(3)][::-1]
    
    db.add(models.DailyCount(date=dates[0].strftime("%Y-%m-%d"), variant_id=v.id, counted_qty=100))
    db.add(models.DailyCount(date=dates[1].strftime("%Y-%m-%d"), variant_id=v.id, counted_qty=97))
    db.add(models.DailyCount(date=dates[2].strftime("%Y-%m-%d"), variant_id=v.id, counted_qty=94))
    
    db.add(models.InventoryBalance(variant_id=v.id, on_hand=0)) # Current stock 0? 
    # Wait, current inventory is sum(on_hand * conversion).
    # If we want logic to see 0 stock, we set on_hand=0 in InventoryBalance.
    # The DailyCount updates InventoryBalance in main.py, but here we manually set it or just existing balance.
    # logic.py reads InventoryBalance.
    
    # Mock settings
    add_settings(db, cover_days="4", safety_buffer="0", lookback_days="14")
    
    # Usage rate should be 3.
    # Demand base = 3 * 10 (conversion) = 30? 
    # NO. The counts are usually in CONTAINER units.
    # If user counted 100 CASES, then usage is 3 CASES = 30 units.
    # If conversion_to_base=10, then demand_base = 3 * 10 = 30.
    # Target (4 days) = 30 * 4 = 120 base units.
    # Current Stock = 0.
    # Q_raw = 120.
    # Case Pack = 10.
    # Cases needed = 120 / 10 = 12 cases.
    
    suggestions = logic.calculate_order_suggestion(db, "MONDAY")
    print([s['suggested_qty'] for s in suggestions])
    
    s = suggestions[0]
    assert s['suggested_qty'] == 12.0
    assert s['unit'] == "箱"
    
    # Test Rounding Up
    # If demand was slightly higher, e.g. 12.1 cases -> 13 cases.
    # Let's change usage.
    # 3.1 cases usage?
    # Hard to tweak usage exactly with integers.
    # Let's drop safety buffer to 0.1 days -> adds 10% demand.
    # Demand 120 + 12 = 132.
    # 132 / 10 = 13.2 -> 14 cases?
    
    db.query(models.Settings).filter_by(key="safety_buffer_days").update({"value": "0.1"})
    db.commit()
    suggestions = logic.calculate_order_suggestion(db, "MONDAY")
    s = suggestions[0]
    # Target = 120 + 3 (0.1*30) = 123.
    # Cases = ceil(123/10) = 13.
    assert s['suggested_qty'] == 13.0

def test_usage_rate_estimation(db):
    p = models.Product(name_zh="Veg", name_en="Veg", category="veg", storage_type="room")
    db.add(p)
    db.commit()
    v = models.Variant(product_id=p.id, form="RAW", container="bag", display_name_zh="Veg-Bag", conversion_to_base=1.0)
    db.add(v)
    db.commit()
    
    # 3 counts, diff 5
    today = datetime.now()
    db.add(models.DailyCount(date=(today-timedelta(days=2)).strftime("%Y-%m-%d"), variant_id=v.id, counted_qty=15))
    db.add(models.DailyCount(date=(today-timedelta(days=1)).strftime("%Y-%m-%d"), variant_id=v.id, counted_qty=10))
    db.add(models.DailyCount(date=today.strftime("%Y-%m-%d"), variant_id=v.id, counted_qty=5))
    
    add_settings(db, cover_days="4", safety_buffer="0", lookback_days="14")
    
    usage, msg = logic.estimate_usage(db, v.id)
    assert usage == 5.0

def test_missing_conversion_warning(db):
    p = models.Product(name_zh="NoConv", name_en="NoConv", category="veg", storage_type="room")
    db.add(p)
    db.commit()
    # No conversion
    v = models.Variant(product_id=p.id, form="RAW", container="box", display_name_zh="Box", conversion_to_base=None)
    db.add(v)
    add_settings(db, cover_days="4", safety_buffer="0", lookback_days="14")
    
    # Add counts so we get suggestions (if usage=0, maybe no suggestion?)
    # Logic: if final_qty > 0 OR missing_conversion
    # But estimate_usage needs 3 counts.
    today = datetime.now()
    db.add(models.DailyCount(date=(today-timedelta(days=2)).strftime("%Y-%m-%d"), variant_id=v.id, counted_qty=10))
    db.add(models.DailyCount(date=(today-timedelta(days=1)).strftime("%Y-%m-%d"), variant_id=v.id, counted_qty=10))
    db.add(models.DailyCount(date=today.strftime("%Y-%m-%d"), variant_id=v.id, counted_qty=10)) # Usage 0
    db.commit()
    
    suggestions = logic.calculate_order_suggestion(db, "MONDAY")
    assert len(suggestions) == 1
    assert "缺少换算" in suggestions[0]['notes']

def test_shred_mix_ratio_allocation(db):
    # 胡萝卜/洋葱/青葱丝 2:1:1
    carrot = models.Product(name_zh="胡萝卜", name_en="Carrot", category="veg", storage_type="room")
    onion = models.Product(name_zh="洋葱", name_en="Onion", category="veg", storage_type="room")
    scallion = models.Product(name_zh="青葱", name_en="Green onion", category="veg", storage_type="room")
    db.add_all([carrot, onion, scallion])
    db.commit()

    v_carrot = models.Variant(product_id=carrot.id, form="PREP_shred", container="box_4inch", display_name_zh="胡萝卜-切丝-4寸盒", conversion_to_base=1.0)
    v_onion = models.Variant(product_id=onion.id, form="PREP_shred", container="box_4inch", display_name_zh="洋葱-切丝-4寸盒", conversion_to_base=1.0)
    v_scallion = models.Variant(product_id=scallion.id, form="PREP_shred", container="box_4inch", display_name_zh="青葱-切丝-4寸盒", conversion_to_base=1.0)
    db.add_all([v_carrot, v_onion, v_scallion])
    db.commit()

    add_settings(db, cover_days="1", safety_buffer="0", lookback_days="14")

    today = datetime.now()
    db.add(models.DailyCount(date=(today-timedelta(days=2)).strftime("%Y-%m-%d"), variant_id=v_carrot.id, counted_qty=100))
    db.add(models.DailyCount(date=(today-timedelta(days=1)).strftime("%Y-%m-%d"), variant_id=v_carrot.id, counted_qty=96))
    db.add(models.DailyCount(date=today.strftime("%Y-%m-%d"), variant_id=v_carrot.id, counted_qty=92))

    db.add(models.DailyCount(date=(today-timedelta(days=2)).strftime("%Y-%m-%d"), variant_id=v_onion.id, counted_qty=100))
    db.add(models.DailyCount(date=(today-timedelta(days=1)).strftime("%Y-%m-%d"), variant_id=v_onion.id, counted_qty=98))
    db.add(models.DailyCount(date=today.strftime("%Y-%m-%d"), variant_id=v_onion.id, counted_qty=96))

    db.add(models.DailyCount(date=(today-timedelta(days=2)).strftime("%Y-%m-%d"), variant_id=v_scallion.id, counted_qty=100))
    db.add(models.DailyCount(date=(today-timedelta(days=1)).strftime("%Y-%m-%d"), variant_id=v_scallion.id, counted_qty=98))
    db.add(models.DailyCount(date=today.strftime("%Y-%m-%d"), variant_id=v_scallion.id, counted_qty=96))
    db.commit()

    suggestions = logic.calculate_order_suggestion(db, "MONDAY")
    by_name = {s["product_name_zh"]: s for s in suggestions}
    assert by_name["胡萝卜"]["suggested_qty"] == pytest.approx(4.0)
    assert by_name["洋葱"]["suggested_qty"] == pytest.approx(2.0)
    assert by_name["青葱"]["suggested_qty"] == pytest.approx(2.0)

def test_veg_cut_styles_separate(db):
    # 只有 PREP_shred 进入丝混合池，切块不应影响其他蔬菜
    carrot = models.Product(name_zh="胡萝卜", name_en="Carrot", category="veg", storage_type="room")
    onion = models.Product(name_zh="洋葱", name_en="Onion", category="veg", storage_type="room")
    scallion = models.Product(name_zh="青葱", name_en="Green onion", category="veg", storage_type="room")
    db.add_all([carrot, onion, scallion])
    db.commit()

    v_chunk = models.Variant(product_id=carrot.id, form="PREP_chunk", container="box_4inch", display_name_zh="胡萝卜-切块-4寸盒", conversion_to_base=1.0)
    v_onion_shred = models.Variant(product_id=onion.id, form="PREP_shred", container="box_4inch", display_name_zh="洋葱-切丝-4寸盒", conversion_to_base=1.0)
    v_scallion_shred = models.Variant(product_id=scallion.id, form="PREP_shred", container="box_4inch", display_name_zh="青葱-切丝-4寸盒", conversion_to_base=1.0)
    db.add_all([v_chunk, v_onion_shred, v_scallion_shred])
    db.commit()

    add_settings(db, cover_days="1", safety_buffer="0", lookback_days="14")

    today = datetime.now()
    db.add(models.DailyCount(date=(today-timedelta(days=2)).strftime("%Y-%m-%d"), variant_id=v_chunk.id, counted_qty=30))
    db.add(models.DailyCount(date=(today-timedelta(days=1)).strftime("%Y-%m-%d"), variant_id=v_chunk.id, counted_qty=25))
    db.add(models.DailyCount(date=today.strftime("%Y-%m-%d"), variant_id=v_chunk.id, counted_qty=20))

    db.add(models.DailyCount(date=(today-timedelta(days=2)).strftime("%Y-%m-%d"), variant_id=v_onion_shred.id, counted_qty=10))
    db.add(models.DailyCount(date=(today-timedelta(days=1)).strftime("%Y-%m-%d"), variant_id=v_onion_shred.id, counted_qty=10))
    db.add(models.DailyCount(date=today.strftime("%Y-%m-%d"), variant_id=v_onion_shred.id, counted_qty=10))

    db.add(models.DailyCount(date=(today-timedelta(days=2)).strftime("%Y-%m-%d"), variant_id=v_scallion_shred.id, counted_qty=10))
    db.add(models.DailyCount(date=(today-timedelta(days=1)).strftime("%Y-%m-%d"), variant_id=v_scallion_shred.id, counted_qty=10))
    db.add(models.DailyCount(date=today.strftime("%Y-%m-%d"), variant_id=v_scallion_shred.id, counted_qty=10))
    db.commit()

    suggestions = logic.calculate_order_suggestion(db, "MONDAY")
    by_name = {s["product_name_zh"]: s for s in suggestions}
    assert by_name["胡萝卜"]["suggested_qty"] == pytest.approx(5.0)
    assert "洋葱" not in by_name
    assert "青葱" not in by_name

def test_q_raw_zero(db):
    p = models.Product(name_zh="Z", name_en="Z", category="veg", storage_type="room")
    db.add(p)
    db.commit()
    v = models.Variant(product_id=p.id, form="RAW", container="bag", display_name_zh="Z", conversion_to_base=1.0)
    db.add(v)
    db.add(models.Settings(key="cover_days_monday", value="4"))
    db.add(models.Settings(key="safety_buffer_days", value="0"))
    db.add(models.Settings(key="lookback_days_for_usage", value="14"))
    db.commit()
    
    # Usage 0
    today = datetime.now()
    db.add(models.DailyCount(date=(today-timedelta(days=1)).strftime("%Y-%m-%d"), variant_id=v.id, counted_qty=10))
    db.add(models.DailyCount(date=today.strftime("%Y-%m-%d"), variant_id=v.id, counted_qty=10))
    
    # Inventory 10 (Current > Target 0)
    db.add(models.InventoryBalance(variant_id=v.id, on_hand=10))
    db.commit()
    
    suggestions = logic.calculate_order_suggestion(db, "MONDAY")
    # Should be empty or 0
    if suggestions:
        assert suggestions[0]['suggested_qty'] == 0.0

def test_csv_export_headers(db):
    p = models.Product(name_zh="胡萝卜", name_en="Carrot", category="veg", storage_type="room", supplier="甲供应商")
    db.add(p)
    db.commit()

    order = models.Order(order_date="2024-01-01", order_type="MONDAY", status="DRAFT")
    db.add(order)
    db.commit()

    line = models.OrderLine(
        order_id=order.id,
        product_id=p.id,
        suggested_qty=3.0,
        final_qty=2.0,
        unit="袋子",
        notes="测试"
    )
    db.add(line)
    db.commit()

    csv_text = csv_export.generate_order_csv(db, order.id)
    assert csv_text.startswith("供应商,类别,商品,建议数量,最终下单,单位,备注")
    assert "甲供应商" in csv_text
    assert "胡萝卜" in csv_text
