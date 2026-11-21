"""announcement details

Revision ID: 8c4d1e9f2a17
Revises: 5b2e7c41a9d0
Create Date: 2026-11-22 14:00:00

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "8c4d1e9f2a17"
down_revision: Union[str, Sequence[str], None] = "5b2e7c41a9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "announcements",
        sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("announcements", "details")
