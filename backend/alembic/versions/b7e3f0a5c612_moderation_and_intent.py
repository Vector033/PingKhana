"""moderation and intent

Revision ID: b7e3f0a5c612
Revises: 8c4d1e9f2a17
Create Date: 2026-11-22 18:00:00

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b7e3f0a5c612"
down_revision: Union[str, Sequence[str], None] = "8c4d1e9f2a17"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "announcements",
        sa.Column(
            "moderation_status", sa.String(length=24), server_default="published", nullable=False
        ),
    )
    op.create_index(
        op.f("ix_announcements_moderation_status"),
        "announcements",
        ["moderation_status"],
        unique=False,
    )
    op.add_column("announcements", sa.Column("post_intent", sa.String(length=32), nullable=True))
    op.add_column("announcements", sa.Column("rejection_reason", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("announcements", "rejection_reason")
    op.drop_column("announcements", "post_intent")
    op.drop_index(op.f("ix_announcements_moderation_status"), table_name="announcements")
    op.drop_column("announcements", "moderation_status")
