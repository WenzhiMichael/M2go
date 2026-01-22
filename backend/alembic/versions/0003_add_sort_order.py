"""add sort order to products and variants

Revision ID: 0003_add_sort_order
Revises: 0002_add_daily_count_adjustment
Create Date: 2026-01-21
"""

from alembic import op
import sqlalchemy as sa

revision = "0003_add_sort_order"
down_revision = "0002_add_daily_count_adjustment"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("products", sa.Column("sort_order", sa.Integer(), nullable=True))
    op.add_column("variants", sa.Column("sort_order", sa.Integer(), nullable=True))


def downgrade():
    op.drop_column("variants", "sort_order")
    op.drop_column("products", "sort_order")
