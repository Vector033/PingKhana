"""source org and platform

Revision ID: 5b2e7c41a9d0
Revises: 7ece8259cf33
Create Date: 2026-11-22 10:00:00

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "5b2e7c41a9d0"
down_revision: Union[str, Sequence[str], None] = "7ece8259cf33"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("sources", sa.Column("org", sa.String(length=80), nullable=True))
    op.create_index(op.f("ix_sources_org"), "sources", ["org"], unique=False)
    op.add_column(
        "sources",
        sa.Column("platform", sa.String(length=24), server_default="web", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("sources", "platform")
    op.drop_index(op.f("ix_sources_org"), table_name="sources")
    op.drop_column("sources", "org")
