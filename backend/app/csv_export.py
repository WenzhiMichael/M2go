import csv
from io import StringIO
from sqlalchemy.orm import Session
from . import models

CSV_HEADERS = ["供应商", "类别", "商品", "建议数量", "最终下单", "单位", "备注"]

CATEGORY_ZH = {
    "protein": "蛋白",
    "veg": "蔬菜",
    "frozen": "冷冻"
}

def generate_order_csv(db: Session, order_id: int) -> str:
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise ValueError("Order not found")

    lines = db.query(models.OrderLine).filter(models.OrderLine.order_id == order_id).all()
    rows = []

    for line in lines:
        product = db.query(models.Product).filter(models.Product.id == line.product_id).first()
        if not product:
            continue

        supplier = product.supplier or ""
        category = CATEGORY_ZH.get(product.category, product.category or "")
        name = product.name_zh
        notes = line.notes or ""

        rows.append([
            supplier,
            category,
            name,
            line.suggested_qty,
            line.final_qty,
            line.unit,
            notes
        ])

    rows.sort(key=lambda r: (r[0], r[1], r[2]))

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(CSV_HEADERS)

    last_group = None
    for row in rows:
        group = (row[0], row[1])
        if last_group and group != last_group:
            writer.writerow([])
        writer.writerow(row)
        last_group = group

    return output.getvalue()
