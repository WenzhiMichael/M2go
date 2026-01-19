"""add daily count adjustment columns

Revision ID: 0002_add_daily_count_adjustment
Revises: 0001_initial
Create Date: 2025-01-19
"""

from alembic import op
import sqlalchemy as sa

revision = "0002_add_daily_count_adjustment"
down_revision = "0001_initial"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column("daily_counts", sa.Column("prev_on_hand", sa.Float(), nullable=True))
    op.add_column("daily_counts", sa.Column("adjustment", sa.Float(), nullable=True))

def downgrade() -> None:
    op.drop_column("daily_counts", "adjustment")
    op.drop_column("daily_counts", "prev_on_hand")
