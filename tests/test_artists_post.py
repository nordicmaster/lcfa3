"""Tests for ``POST /artists`` (``create_or_override_artist``).

Covers the add-artist flows the API exposes:

* a brand-new artist is fetched from Last.fm and upserted into PostgreSQL;
* an existing artist whose 1-minute dedup window is still open is answered
  from Redis or from PostgreSQL without touching Last.fm;
* an existing artist whose dedup window has closed is refreshed from Last.fm
  (the upsert/override path);
* an artist that does not exist on Last.fm yields HTTP 404;
* a blank name yields HTTP 422.

Last.fm and the PostgreSQL-specific ``push_or_update`` upsert are mocked so the
tests run fully offline against an in-memory SQLite database.
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import status
from sqlalchemy import insert

import api.api_v1.artists as artists_module
from models.artist import ArtistModel
from schemas.artist import ArtistCreate, ArtistRead, ArtistWrite

from tests.helpers import FakeCache, make_artist_dict, make_artist_row


@pytest.fixture
def seeded_engine(engine):
    """Engine pre-seeded with two artists; returns the shared engine."""
    with engine.begin() as conn:
        conn.execute(
            insert(ArtistModel),
            [
                make_artist_dict("Metallica", 5_118_000, 987_654, 1.234),
                make_artist_dict("Pink Floyd", 1_234_567, 654_321, 0.556),
            ],
        )
    return engine


async def _post(cache, name, session, monkeypatch):
    monkeypatch.setattr(artists_module, "cache", cache)
    return await artists_module.create_or_override_artist(
        body=ArtistCreate(name=name),
        session=session,
    )


async def test_new_artist_is_fetched_from_lastfm_and_upserted(
    seeded_engine, session, monkeypatch
):
    cache = FakeCache()
    lastfm_artist = ArtistWrite(
        name="Ghost", listeners=5_000, scrobbles=4_444, ratio=1.111
    )
    upserted = make_artist_row(3, "Ghost", 5_000, 4_444, 1.111)

    with (
        patch.object(
            artists_module, "get_lastfm_info", AsyncMock(return_value=lastfm_artist)
        ) as get_info,
        patch.object(
            artists_module, "push_or_update", AsyncMock(return_value=upserted)
        ) as upsert,
    ):
        result = await _post(cache, "Ghost", session, monkeypatch)

    assert result is upserted
    get_info.assert_awaited_once_with("Ghost")
    assert upsert.await_args.args[0] is session
    assert upsert.await_args.args[1] is lastfm_artist
    assert cache.mark_posted_calls == ["Ghost"]


async def test_recently_posted_artist_is_served_from_redis(
    seeded_engine, session, monkeypatch
):
    now = datetime.now(timezone.utc)
    cached_artist = {
        "id": 1,
        "name": "Metallica",
        "listeners": 5_118_000,
        "scrobbles": 987_654,
        "ratio": 1.234,
        "created_at": now,
        "updated_at": now,
    }
    cache = FakeCache(recently_posted=True, cached_artist=cached_artist)

    with (
        patch.object(artists_module, "get_lastfm_info", AsyncMock()) as get_info,
        patch.object(artists_module, "push_or_update", AsyncMock()) as upsert,
    ):
        result = await _post(cache, "Metallica", session, monkeypatch)

    assert isinstance(result, ArtistRead)
    assert result.name == "Metallica"
    assert result.listeners == 5_118_000
    get_info.assert_not_awaited()
    upsert.assert_not_awaited()
    assert cache.mark_posted_calls == []


async def test_recently_posted_artist_falls_back_to_database(
    seeded_engine, session, monkeypatch
):
    cache = FakeCache(recently_posted=True, cached_artist=None)

    with (
        patch.object(artists_module, "get_lastfm_info", AsyncMock()) as get_info,
        patch.object(artists_module, "push_or_update", AsyncMock()) as upsert,
    ):
        result = await _post(cache, "Metallica", session, monkeypatch)

    assert isinstance(result, ArtistModel)
    assert result.name == "Metallica"
    assert len(cache.set_artist_calls) == 1
    assert cache.set_artist_calls[0] is result
    get_info.assert_not_awaited()
    upsert.assert_not_awaited()
    assert cache.mark_posted_calls == []


async def test_existing_artist_outside_dedup_window_is_refreshed(
    seeded_engine, session, monkeypatch
):
    cache = FakeCache()  # dedup window closed -> Last.fm must be called
    lastfm_artist = ArtistWrite(
        name="Metallica", listeners=6_000_000, scrobbles=1_000_000, ratio=0.167
    )
    upserted = make_artist_row(1, "Metallica", 6_000_000, 1_000_000, 0.167)

    with (
        patch.object(
            artists_module, "get_lastfm_info", AsyncMock(return_value=lastfm_artist)
        ) as get_info,
        patch.object(
            artists_module, "push_or_update", AsyncMock(return_value=upserted)
        ) as upsert,
    ):
        result = await _post(cache, "Metallica", session, monkeypatch)

    assert result is upserted
    get_info.assert_awaited_once_with("Metallica")
    assert upsert.await_args.args[1] is lastfm_artist
    assert cache.mark_posted_calls == ["Metallica"]


async def test_unknown_artist_returns_404(seeded_engine, session, monkeypatch):
    cache = FakeCache()
    error_message = "The artist you supplied could not be found"

    with (
        patch.object(
            artists_module, "get_lastfm_info", AsyncMock(return_value=error_message)
        ) as get_info,
        patch.object(artists_module, "push_or_update", AsyncMock()) as upsert,
        patch("builtins.print"),
    ):
        result = await _post(cache, "No Such Band", session, monkeypatch)

    assert result.status_code == status.HTTP_404_NOT_FOUND
    assert result.body == error_message.encode("utf-8")
    get_info.assert_awaited_once_with("No Such Band")
    upsert.assert_not_awaited()
    assert cache.mark_posted_calls == []


async def test_blank_name_returns_422(seeded_engine, session, monkeypatch):
    cache = FakeCache()

    with (
        patch.object(artists_module, "get_lastfm_info", AsyncMock()) as get_info,
        patch.object(artists_module, "push_or_update", AsyncMock()) as upsert,
    ):
        result = await _post(cache, "   ", session, monkeypatch)

    assert result.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
    assert b"must not be empty" in result.body
    get_info.assert_not_awaited()
    upsert.assert_not_awaited()
    assert cache.mark_posted_calls == []