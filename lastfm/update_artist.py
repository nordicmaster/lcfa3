"""Upsert helper for artist stats fetched from Last.fm."""

from datetime import datetime, timezone

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from models.artist import ArtistModel
from redis_client import cache
from schemas.artist import ArtistWrite


async def push_or_update(session: AsyncSession, artist: ArtistWrite) -> ArtistModel:
    """ Upsert artist stats in PostgreSQL and warm the Redis cache.

    Uses ``INSERT ... ON CONFLICT DO UPDATE`` on the unique artist name, then
    commits and re-caches the row so ``GET /artists`` stays consistent.
    """
    stmt = insert(ArtistModel).values(
        name=artist.name,
        listeners=artist.listeners,
        scrobbles=artist.scrobbles,
        ratio=artist.ratio,
        updated_at=datetime.now(timezone.utc),
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=[ArtistModel.name],
        set_={
            "listeners": stmt.excluded.listeners,
            "scrobbles": stmt.excluded.scrobbles,
            "ratio": stmt.excluded.ratio,
            "updated_at": stmt.excluded.updated_at,
        },
    ).returning(ArtistModel)
    result = await session.execute(stmt)
    artist_row = result.scalar_one()
    await session.commit()
    await cache.set_artist(artist_row)
    return artist_row