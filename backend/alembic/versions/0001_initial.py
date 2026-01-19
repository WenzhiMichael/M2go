"""initial tables

Revision ID: 0001_initial
Revises: 
Create Date: 2025-01-19
"""

from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name_zh", sa.String(), nullable=False),
        sa.Column("name_en", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("storage_type", sa.String(), nullable=False),
        sa.Column("supplier", sa.String(), nullable=True),
        sa.Column("case_pack", sa.Float(), nullable=True),
        sa.Column("min_order_qty", sa.Float(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True)
    )

    op.create_table(
        "variants",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id")),
        sa.Column("form", sa.String(), nullable=False),
        sa.Column("container", sa.String(), nullable=False),
        sa.Column("conversion_to_base", sa.Float(), nullable=True),
        sa.Column("display_name_zh", sa.String(), nullable=False)
    )

    op.create_table(
        "inventory_balances",
        sa.Column("variant_id", sa.Integer(), sa.ForeignKey("variants.id"), primary_key=True),
        sa.Column("on_hand", sa.Float(), nullable=True)
    )

    op.create_table(
        "daily_counts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("date", sa.String(), nullable=False),
        sa.Column("variant_id", sa.Integer(), sa.ForeignKey("variants.id")),
        sa.Column("counted_qty", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True)
    )

    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_date", sa.String(), nullable=False),
        sa.Column("order_type", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True)
    )

    op.create_table(
        "order_lines",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id")),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id")),
        sa.Column("suggested_qty", sa.Float(), nullable=True),
        sa.Column("final_qty", sa.Float(), nullable=True),
        sa.Column("unit", sa.String(), nullable=False),
        sa.Column("reason_json", sa.JSON(), nullable=True),
        sa.Column("notes", sa.String(), nullable=True)
    )

    op.create_table(
        "settings",
        sa.Column("key", sa.String(), primary_key=True),
        sa.Column("value", sa.String(), nullable=False)
    )

def downgrade() -> None:
    op.drop_table("order_lines")
    op.drop_table("orders")
    op.drop_table("daily_counts")
    op.drop_table("inventory_balances")
    op.drop_table("variants")
    op.drop_table("products")
    op.drop_table("settings")
