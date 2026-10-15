"""Regression tests for ``GET /artists`` vs. the Redis name index.

Reproduces the bug where the artists page opens empty even though rows exist
in PostgreSQL:

* Redis still holds names in the ``artist:index`` SET (index members are never
  expired or cleaned up), but the per-artist ``artist:<name>`` keys have
  already expired after their TTL.
* In ``api/api_v1/artists.py`` the Redis-first backfill built the "missing"
  set from **lowercased** index names, while PostgreSQL stores artist names in
  their original case (e.g. ``Metallica``).
* ``artist.name IN (...)`` is case-sensitive, so the DB query found nothing,
  ``cached_by_name`` stayed empty and the handler returned ``[]`` instead of
  falling back to the cold PostgreSQL path.

These tests drive the real ``get_artists`` endpoint function against an
in-memory SQLite database (via a thin async session wrapper) and a fake Redis
cache, so no live PostgreSQL/Redis is required.
"""

from datetime import datetime, timezone

import pytest
from sqlalchemy import insert

import api.api_v1.artists as artists_module
from models.artist import ArtistModel

from tests.helpers import FakeCache, make_artist_dict


@pytest.fixture
def seeded_engine(engine):
    """Engine pre-seeded with three artists; returns the shared engine."""
    with engine.begin() as conn:
        conn.execute(
            insert(ArtistModel),
            [
                make_artist_dict("Metallica", 5_118_000, 987_654, 1.234),
                make_artist_dict("Pink Floyd", 1_234_567, 654_321, 0.556),
                make_artist_dict("Ghost", 5_000, 4_444, 1.111),
            ],
        )
    return engine


async def _fetch(cache, session, monkeypatch):
    monkeypatch.setattr(artists_module, "cache", cache)
    return await artists_module.get_artists(
        sort_by="ratio", order="desc", session=session
    )


async def test_expired_cache_but_matching_db_rows(seeded_engine, session, monkeypatch):
    """Return every artist the index still knows when their cache keys expired."""
    cache = FakeCache(index_names=["Metallica", "Pink Floyd"])

    artists = await _fetch(cache, session, monkeypatch)

    assert sorted(a.name for a in artists) == ["Metallica", "Pink Floyd"]
    # The DB backfill must have re-warmed the cache.
    assert len(cache.set_artists_calls) == 1


async def test_expired_cache_and_wrong_case_in_index(seeded_engine, session, monkeypatch):
    """Fall back to the cold PostgreSQL path when index casing mismatches the
    database — never to an empty page."""
    cache = FakeCache(index_names=["metallica", "pink floyd"])

    artists = await _fetch(cache, session, monkeypatch)

    assert sorted(a.name for a in artists) == ["Ghost", "Metallica", "Pink Floyd"]


async def test_partial_cache_hits_are_refilled_from_the_database(
    seeded_engine, session, monkeypatch
):
    """An expired key must come back from PostgreSQL without losing the cached
    hit for the artist that still has a live key."""

    class _PartialCache(FakeCache):
        async def get_artists(self, names):
            now = datetime.now(timezone.utc)
            return {
                "metallica": {
                    "id": 1,
                    "name": "Metallica",
                    "listeners": 5_118_000,
                    "scrobbles": 987_654,
                    "ratio": 1.234,
                    "created_at": now,
                    "updated_at": now,
                }
            }

    cache = _PartialCache(index_names=["Metallica", "Pink Floyd"])

    artists = await _fetch(cache, session, monkeypatch)

    assert sorted(a.name for a in artists) == ["Metallica", "Pink Floyd"]
    # The expired key must have been topped up from the DB.
    assert len(cache.set_artists_calls) == 1


async def test_index_out_of_sync_with_database(seeded_engine, session, monkeypatch):
    """An index referencing names that no longer exist must fall back to the
    full PostgreSQL listing."""
    cache = FakeCache(index_names=["metallica", "INVALID"])

    artists = await _fetch(cache, session, monkeypatch)

    assert sorted(a.name for a in artists) == ["Ghost", "Metallica", "Pink Floyd"]


async def test_empty_index_cold_path(seeded_engine, session, monkeypatch):
    """The classic cold path (empty index / Redis down) must keep working."""
    cache = FakeCache(index_names=[])

    artists = await _fetch(cache, session, monkeypatch)

    assert sorted(a.name for a in artists) == ["Ghost", "Metallica", "Pink Floyd"]