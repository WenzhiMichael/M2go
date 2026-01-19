from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
import math
import json
from . import models

# Default settings
DEFAULT_SETTINGS = {
    "lookback_days_for_usage": "14",
    "safety_buffer_days": "0.8",
    "cover_days_monday": "4",
    "cover_days_friday": "4",
    "cutoff_time": "17:00"
}

# Shred mix rule: 胡萝卜丝/洋葱丝/青葱丝按 2:1:1 混合
SHRED_MIX_RATIOS = {
    "胡萝卜": 2.0,
    "洋葱": 1.0,
    "青葱": 1.0
}
SHRED_FORMS = {"PREP_shred", "PREP_切丝"}

def is_shred_mix_variant(product: models.Product, variant: models.Variant) -> bool:
    return product.name_zh in SHRED_MIX_RATIOS and variant.form in SHRED_FORMS

def get_setting(db: Session, key: str) -> str:
    setting = db.query(models.Settings).filter(models.Settings.key == key).first()
    if setting:
        return setting.value
    return DEFAULT_SETTINGS.get(key, "")

def estimate_usage(db: Session, variant_id: int):
    lookback_days = int(get_setting(db, "lookback_days_for_usage"))
    cutoff_date = (datetime.now() - timedelta(days=lookback_days)).strftime("%Y-%m-%d")

    # Get daily counts for the last N days
    counts = db.query(models.DailyCount).filter(
        models.DailyCount.variant_id == variant_id,
        models.DailyCount.date >= cutoff_date
    ).order_by(models.DailyCount.date).all()

    if len(counts) < 3:
        return 0.0, "数据不足，日消耗按0估算；可手动设置或先积累盘点数据。"

    usages = []
    # Calculate usage between consecutive days
    # This is a simplified logic: prev_count - current_count (assuming no deliveries for simplicity in MVP, 
    # or just raw diff. Real world complex logic needed but MVP allows simplification)
    # Better MVP approach per prompt prompt: usage_day = max(0, prev_counted_qty - today_counted_qty)
    # The prompt implies we compare day N and N+1.
    
    # Actually, if we have counts on Day 1, Day 2, Day 3...
    # Usage Day 2 = Count Day 1 - Count Day 2 (assuming no delivery came in between)
    # Since delivery days are Tue/Sat, this simple logic fails on delivery days.
    # But prompt says "Estimate daily usage rate... max(0, prev - today)". 
    # We will strictly follow the prompt formula for MVP.
    
    for i in range(1, len(counts)):
        prev = counts[i-1]
        curr = counts[i]
        # Check if dates are consecutive? unique logic if gap? 
        # For MVP, we just take the difference if dates are close enough or just sequential records.
        usage = max(0, prev.counted_qty - curr.counted_qty)
        usages.append(usage)

    if not usages:
        return 0.0, "无消耗数据"

    avg_usage = sum(usages) / len(usages)
    return avg_usage, f"基于{len(usages)}天记录"

def calculate_order_suggestion(db: Session, order_type: str):
    products = db.query(models.Product).filter(models.Product.is_active == True).all()
    suggestions = []

    # Settings
    cover_days = float(get_setting(db, f"cover_days_{order_type.lower()}"))
    safety_buffer = float(get_setting(db, "safety_buffer_days"))

    # Pre-calc usage & stock for all variants (needed for shred mix pooling)
    variant_stats = {}
    shred_mix_usage_base = 0.0
    shred_mix_inventory_base = 0.0
    shred_mix_missing_conversion = False
    shred_mix_insufficient = False
    shred_mix_details = []
    shred_mix_total_ratio = sum(SHRED_MIX_RATIOS.values())

    for p in products:
        for v in p.variants:
            usage_rate, usage_msg = estimate_usage(db, v.id)
            balance = db.query(models.InventoryBalance).filter_by(variant_id=v.id).first()
            on_hand = balance.on_hand if balance else 0.0

            variant_stats[v.id] = {
                "usage_rate": usage_rate,
                "usage_msg": usage_msg,
                "on_hand": on_hand
            }

            if is_shred_mix_variant(p, v):
                shred_mix_details.append(f"{v.display_name_zh}: rate={usage_rate:.2f}, stock={on_hand}")
                if v.conversion_to_base is not None:
                    shred_mix_usage_base += usage_rate * v.conversion_to_base
                    shred_mix_inventory_base += on_hand * v.conversion_to_base
                else:
                    shred_mix_missing_conversion = True
                if usage_msg.startswith("数据不足"):
                    shred_mix_insufficient = True

    for p in products:
        daily_demand_base = 0.0
        current_inventory_base = 0.0
        
        variant_details = []
        missing_conversion = False
        data_insufficient = False
        
        # 1. Aggregate Demand & Inventory
        for v in p.variants:
            if is_shred_mix_variant(p, v):
                continue

            stats = variant_stats.get(v.id, {})
            usage_rate = stats.get("usage_rate", 0.0)
            usage_msg = stats.get("usage_msg", "")
            on_hand = stats.get("on_hand", 0.0)

            if usage_msg.startswith("数据不足"):
                data_insufficient = True

            if v.conversion_to_base is not None:
                daily_demand_base += usage_rate * v.conversion_to_base
                current_inventory_base += on_hand * v.conversion_to_base
                variant_details.append(f"{v.display_name_zh}: rate={usage_rate:.2f}, stock={on_hand}")
            else:
                missing_conversion = True
                variant_details.append(f"{v.display_name_zh}: [无换算] rate={usage_rate:.2f}, stock={on_hand}")

        # Shred mix allocation (胡萝卜/洋葱/青葱 丝按 2:1:1 分配)
        if p.name_zh in SHRED_MIX_RATIOS:
            ratio = SHRED_MIX_RATIOS[p.name_zh] / shred_mix_total_ratio if shred_mix_total_ratio > 0 else 0.0
            daily_demand_base += shred_mix_usage_base * ratio
            current_inventory_base += shred_mix_inventory_base * ratio
            variant_details.append(f"丝混合池(2:1:1) 分配系数={ratio:.2f}")

            if shred_mix_missing_conversion:
                missing_conversion = True
            if shred_mix_insufficient:
                data_insufficient = True

        # 2. Target Stock
        target_stock = daily_demand_base * cover_days + safety_buffer * daily_demand_base
        
        # 3. Raw Qty
        q_raw = max(0, target_stock - current_inventory_base)
        
        # 4. Rounding & Unit Logic
        final_qty = q_raw
        unit = "基准单位(份)"
        notes = []
        
        if missing_conversion:
            notes.append("警告: 缺少换算，订货可能不准，请先补全换算。")

        if data_insufficient:
            notes.append("数据不足，日消耗按0估算；可手动设置或先积累盘点数据。")
        
        loading_risk = False
        if daily_demand_base > 0 and (current_inventory_base / daily_demand_base) < cover_days:
            loading_risk = True
            notes.append("风险: 可能撑不到下次到货")

        # Protein Rounding (Case)
        if p.category == "protein":
            if p.case_pack:
                cases = math.ceil(q_raw / p.case_pack)
                final_qty = cases
                unit = "箱"
                notes.append(f"整箱取整: {q_raw:.2f}->{cases}箱 (规格{p.case_pack})")
            else:
                notes.append("错误: 缺少整箱规格 (case_pack)")
        
        # Min Order Qty
        elif p.min_order_qty and final_qty > 0 and final_qty < p.min_order_qty:
                final_qty = p.min_order_qty
                notes.append(f"满足起订量: {p.min_order_qty}")

        # Construct Reason JSON
        reason = {
            "cover_days": cover_days,
            "daily_demand": daily_demand_base,
            "safety_buffer": safety_buffer,
            "target_stock": target_stock,
            "current_inventory": current_inventory_base,
            "q_raw": q_raw,
            "details": variant_details
        }

        if final_qty > 0 or missing_conversion: # Only suggest if needed or if user checks
             suggestions.append({
                "product_id": p.id,
                "product_name_zh": p.name_zh,
                "suggested_qty": final_qty,
                "final_qty": final_qty,
                "unit": unit,
                "reason_json": reason,
                "notes": "; ".join(notes),
                "loading_risk": loading_risk
            })

    return suggestions
