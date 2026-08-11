"""add unique constraint on artists.name

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-08-11 13:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Remove duplicate rows before adding the unique constraint.
    # Keep the row with the lowest id for each name.
    op.execute(
        """
        DELETE FROM artists a
        USING artists b
        WHERE a.name = b.name AND a.id > b.id
        """
    )
    op.create_unique_constraint('uq_artists_name', 'artists', ['name'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('uq_artists_name', 'artists', type_='unique')