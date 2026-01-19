from sqlalchemy.orm import Session
from . import models, database

DEFAULT_SETTINGS = {
    "lookback_days_for_usage": "14",
    "safety_buffer_days": "0.8",
    "cover_days_monday": "4",
    "cover_days_friday": "4",
    "cutoff_time": "17:00"
}

def seed_data(db: Session):
    has_products = db.query(models.Product).first() is not None

    # Proteins
    if not has_products:
        proteins = [
            {"name_zh": "白鸡", "name_en": "White Chicken", "case_pack": 10}, # Example pack
            {"name_zh": "黑鸡", "name_en": "Dark Chicken", "case_pack": 10},
            {"name_zh": "牛肉", "name_en": "Beef", "case_pack": 5},
            {"name_zh": "鸡翅", "name_en": "Chicken Wings", "case_pack": 8},
        ]
        
        for p_data in proteins:
            p = models.Product(**p_data, category="protein", storage_type="chill")
            db.add(p)
            db.commit()
            db.refresh(p)
            
            # Variants for Protein
            # RAW-case (ordering unit), RAW-bag, COOKED-2inch, COOKED-4inch
            variants = [
                {"form": "RAW", "container": "case", "display_name_zh": f"{p.name_zh}-原箱(生)", "conversion_to_base": p.case_pack}, # Base = 1 unit inside? Or Base = 1 lb? Let's assume Base is "bag" or similar. Actually prompt says "provide conversion per container". 
                # flexible assumption: Base unit = 1 portion/bag. Case = X base units.
                {"form": "RAW", "container": "bag", "display_name_zh": f"{p.name_zh}-袋装(生)", "conversion_to_base": 1.0},
                {"form": "COOKED_CHILL", "container": "box_2inch", "display_name_zh": f"{p.name_zh}-预炸(冷藏)-2寸盒", "conversion_to_base": 0.5},
                {"form": "COOKED_CHILL", "container": "box_4inch", "display_name_zh": f"{p.name_zh}-预炸(冷藏)-4寸盒", "conversion_to_base": 1.0},
            ]
            for v_data in variants:
                db.add(models.Variant(**v_data, product_id=p.id))
    
        # Veggies
        veggies = [
            {"name_zh": "青椒", "name_en": "Green pepper", "min_order_qty": 1},
            {"name_zh": "芹菜", "name_en": "Celery", "min_order_qty": 1},
            {"name_zh": "西兰花", "name_en": "Broccoli", "min_order_qty": 1},
            {"name_zh": "胡萝卜", "name_en": "Carrot", "min_order_qty": 1},
            {"name_zh": "洋葱", "name_en": "Onion", "min_order_qty": 1},
            {"name_zh": "青葱", "name_en": "Green onion", "min_order_qty": 1},
            {"name_zh": "蘑菇", "name_en": "Mushroom", "min_order_qty": 1},
            {"name_zh": "豆芽", "name_en": "Bean sprouts", "min_order_qty": 1},
        ]

        for p_data in veggies:
            p = models.Product(**p_data, category="veg", storage_type="room") # Simplified storage
            db.add(p)
            db.commit()
            db.refresh(p)
            
            # Common Variants: RAW-case, RAW-bag
            db.add(models.Variant(product_id=p.id, form="RAW", container="case", display_name_zh=f"{p.name_zh}-原箱", conversion_to_base=10.0))
            db.add(models.Variant(product_id=p.id, form="RAW", container="bag", display_name_zh=f"{p.name_zh}-袋装", conversion_to_base=1.0))
            
            # Cut styles
            cuts = []
            if p.name_en in ["Green pepper", "Carrot", "Onion"]:
                cuts.append(("chunk", "切块"))
            if p.name_en in ["Onion", "Green onion", "Carrot"]:
                cuts.append(("shred", "切丝"))
            if p.name_en in ["Carrot", "Broccoli"]: # Broccoli stem in prompt, simplified to Broccoli here
                cuts.append(("dice", "切丁"))

            container_map = {
                "box_2inch": ("2寸盒", 0.5),
                "box_4inch": ("4寸盒", 1.0),
            }

            for cut_key, cut_label in cuts:
                for container, (container_label, base_conv) in container_map.items():
                    db.add(models.Variant(
                        product_id=p.id,
                        form=f"PREP_{cut_key}",
                        container=container,
                        display_name_zh=f"{p.name_zh}-{cut_label}-{container_label}",
                        conversion_to_base=base_conv
                    ))

        # Frozen
        frozen_items = [
            "芒果", "玛格丽塔", "草莓", "覆盆子", "桃子", # Smoothies
            "芝麻球", "饺子", "馄饨", "大虾", "小虾", "春卷", "天妇罗炸虾", "玉米粒"
        ]
        for name in frozen_items:
            p = models.Product(name_zh=name, name_en=name, category="frozen", storage_type="frozen")
            db.add(p)
            db.commit()
            db.refresh(p)
            db.add(models.Variant(product_id=p.id, form="FROZEN", container="case", display_name_zh=f"{name}-原箱", conversion_to_base=10.0))
            db.add(models.Variant(product_id=p.id, form="FROZEN", container="bag", display_name_zh=f"{name}-袋装", conversion_to_base=1.0))

    # Ensure settings are seeded even if products already exist
    for key, value in DEFAULT_SETTINGS.items():
        exists = db.query(models.Settings).filter(models.Settings.key == key).first()
        if not exists:
            db.add(models.Settings(key=key, value=value))

    db.commit()
