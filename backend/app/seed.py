from sqlalchemy.orm import Session
from sqlalchemy import func
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

    def ensure_product(name_zh, name_en, category, storage_type, case_pack=None, min_order_qty=None):
        existing = db.query(models.Product).filter(models.Product.name_zh == name_zh).first()
        if existing:
            return existing
        product = models.Product(
            name_zh=name_zh,
            name_en=name_en,
            category=category,
            storage_type=storage_type,
            case_pack=case_pack,
            min_order_qty=min_order_qty
        )
        db.add(product)
        db.commit()
        db.refresh(product)
        return product

    def ensure_variant(product, form, container, display_name_zh, conversion_to_base=None):
        exists = db.query(models.Variant).filter_by(
            product_id=product.id,
            form=form,
            container=container
        ).first()
        if not exists:
            db.add(models.Variant(
                product_id=product.id,
                form=form,
                container=container,
                display_name_zh=display_name_zh,
                conversion_to_base=conversion_to_base
            ))

    # Proteins
    if not has_products:
        proteins = [
            {"name_zh": "鸡球", "name_en": "Chicken Ball", "case_pack": 10},
            {"name_zh": "柠檬鸡", "name_en": "Lemon Chicken", "case_pack": 10},
            {"name_zh": "黑鸡", "name_en": "Dark Chicken", "case_pack": 10},
            {"name_zh": "牛肉", "name_en": "Beef", "case_pack": 5},
            {"name_zh": "鸡翅", "name_en": "Chicken Wings", "case_pack": 8},
            {"name_zh": "猪肉", "name_en": "Pork", "case_pack": 10},
        ]
        
        protein_order = 1
        for p_data in proteins:
            p = models.Product(**p_data, category="protein", storage_type="chill", sort_order=protein_order)
            db.add(p)
            db.commit()
            db.refresh(p)
            protein_order += 1
            
            # Variants for Protein
            # RAW: case/bag, COOKED_CHILL: case/2inch/4inch
            variants = [
                {"form": "RAW", "container": "case", "display_name_zh": f"{p.name_zh}-原箱(生)", "conversion_to_base": p.case_pack},
                {"form": "RAW", "container": "bag", "display_name_zh": f"{p.name_zh}-袋装(生)", "conversion_to_base": 1.0},
                {"form": "COOKED_CHILL", "container": "case", "display_name_zh": f"{p.name_zh}-预炸(冷藏)-整箱", "conversion_to_base": p.case_pack},
                {"form": "COOKED_CHILL", "container": "box_2inch", "display_name_zh": f"{p.name_zh}-预炸(冷藏)-2寸盒", "conversion_to_base": 0.5},
                {"form": "COOKED_CHILL", "container": "box_4inch", "display_name_zh": f"{p.name_zh}-预炸(冷藏)-4寸盒", "conversion_to_base": 1.0},
            ]
            variant_order = 1
            for v_data in variants:
                db.add(models.Variant(**v_data, product_id=p.id, sort_order=variant_order))
                variant_order += 1
    
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

        veg_order = 1
        for p_data in veggies:
            p = models.Product(**p_data, category="veg", storage_type="room", sort_order=veg_order) # Simplified storage
            db.add(p)
            db.commit()
            db.refresh(p)
            veg_order += 1
            
            # Common Variants: RAW-case, RAW-bag
            db.add(models.Variant(product_id=p.id, form="RAW", container="case", display_name_zh=f"{p.name_zh}-原箱", conversion_to_base=10.0, sort_order=1))
            db.add(models.Variant(product_id=p.id, form="RAW", container="bag", display_name_zh=f"{p.name_zh}-袋装", conversion_to_base=1.0, sort_order=2))
            
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

            variant_order = 3
            for cut_key, cut_label in cuts:
                for container, (container_label, base_conv) in container_map.items():
                    db.add(models.Variant(
                        product_id=p.id,
                        form=f"PREP_{cut_key}",
                        container=container,
                        display_name_zh=f"{p.name_zh}-{cut_label}-{container_label}",
                        conversion_to_base=base_conv,
                        sort_order=variant_order
                    ))
                    variant_order += 1

        # Frozen
        frozen_items = [
            "芒果", "玛格丽塔", "草莓", "覆盆子", "桃子", # Smoothies
            "芝麻球", "饺子", "馄饨", "大虾", "小虾", "春卷", "天妇罗炸虾", "玉米粒"
        ]
        frozen_order = 1
        for name in frozen_items:
            p = models.Product(name_zh=name, name_en=name, category="frozen", storage_type="frozen", sort_order=frozen_order)
            db.add(p)
            db.commit()
            db.refresh(p)
            frozen_order += 1
            db.add(models.Variant(product_id=p.id, form="FROZEN", container="case", display_name_zh=f"{name}-原箱", conversion_to_base=10.0, sort_order=1))
            db.add(models.Variant(product_id=p.id, form="FROZEN", container="bag", display_name_zh=f"{name}-袋装", conversion_to_base=1.0, sort_order=2))
    else:
        # Rename legacy white-chicken products if needed
        rename_map = {
            "鸡球用白鸡": ("鸡球", "Chicken Ball"),
            "柠檬鸡用白鸡": ("柠檬鸡", "Lemon Chicken")
        }
        for old_name, (new_zh, new_en) in rename_map.items():
            old_p = db.query(models.Product).filter(models.Product.name_zh == old_name).first()
            new_p = db.query(models.Product).filter(models.Product.name_zh == new_zh).first()
            if old_p and not new_p:
                old_p.name_zh = new_zh
                old_p.name_en = new_en
                variants = db.query(models.Variant).filter(models.Variant.product_id == old_p.id).all()
                for v in variants:
                    if v.display_name_zh and v.display_name_zh.startswith(old_name):
                        v.display_name_zh = v.display_name_zh.replace(old_name, new_zh, 1)

        # Ensure protein products + raw + cooked/chill variants exist (for old data)
        protein_seed = [
            {"name_zh": "鸡球", "name_en": "Chicken Ball", "case_pack": 10},
            {"name_zh": "柠檬鸡", "name_en": "Lemon Chicken", "case_pack": 10},
            {"name_zh": "黑鸡", "name_en": "Dark Chicken", "case_pack": 10},
            {"name_zh": "牛肉", "name_en": "Beef", "case_pack": 5},
            {"name_zh": "鸡翅", "name_en": "Chicken Wings", "case_pack": 8},
            {"name_zh": "猪肉", "name_en": "Pork", "case_pack": 10},
        ]
        proteins = [ensure_product(p["name_zh"], p["name_en"], "protein", "chill", p["case_pack"]) for p in protein_seed]
        for p in proteins:
            ensure_variant(
                p,
                "RAW",
                "case",
                f"{p.name_zh}-原箱(生)",
                p.case_pack
            )
            ensure_variant(
                p,
                "RAW",
                "bag",
                f"{p.name_zh}-袋装(生)",
                1.0
            )
            ensure_variant(
                p,
                "COOKED_CHILL",
                "case",
                f"{p.name_zh}-预炸(冷藏)-整箱",
                p.case_pack
            )
            ensure_variant(
                p,
                "COOKED_CHILL",
                "box_2inch",
                f"{p.name_zh}-预炸(冷藏)-2寸盒",
                0.5
            )
            ensure_variant(
                p,
                "COOKED_CHILL",
                "box_4inch",
                f"{p.name_zh}-预炸(冷藏)-4寸盒",
                1.0
            )

        # Fill missing sort_order for products and variants
        for category in ["protein", "veg", "frozen"]:
            items = db.query(models.Product).filter(models.Product.category == category).order_by(func.coalesce(models.Product.sort_order, 9999), models.Product.id.asc()).all()
            order = 1
            for p in items:
                if p.sort_order is None:
                    p.sort_order = order
                order += 1
                variants = db.query(models.Variant).filter(models.Variant.product_id == p.id).order_by(func.coalesce(models.Variant.sort_order, 9999), models.Variant.id.asc()).all()
                v_order = 1
                for v in variants:
                    if v.sort_order is None:
                        v.sort_order = v_order
                    v_order += 1

    # Ensure settings are seeded even if products already exist
    for key, value in DEFAULT_SETTINGS.items():
        exists = db.query(models.Settings).filter(models.Settings.key == key).first()
        if not exists:
            db.add(models.Settings(key=key, value=value))

    db.commit()
