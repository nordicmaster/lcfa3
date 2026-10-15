"""Tests for ``GET /artists/tags`` (``get_artists_tags``).

The handler loads the ignored-tags list from PostgreSQL, asks Last.fm for the
artist's top tags and drops every tag that is ignored. These tests drive the
real endpoint function with Last.fm mocked and the ignored-tags query running
against an in-memory SQLite database.
"""

from unittest.mock import AsyncMock, patch

import pytest
from fastapi import status
from sqlalchemy import insert

import api.api_v1.artists as artists_module
from models.ignored_tag import IgnoredTagModel


@pytest.fixture
def seeded_engine(engine):
    """Engine pre-seeded with ignored tags; returns the shared engine."""
    with engine.begin() as conn:
        conn.execute(insert(IgnoredTagModel), [{"name": "Rock"}, {"name": "Pop"}])
    return engine


async def _tags(name, session):
    return await artists_module.get_artists_tags(name=name, session=session)


async def test_ignored_tags_are_dropped_from_lastfm_response(seeded_engine, session):
    with patch.object(
        artists_module,
        "get_top_tags",
        AsyncMock(return_value=[("Rock", 123), ("Metal", 456)]),
    ):
        tags = await _tags("Metallica", session)

    assert tags == [("Metal", 456)]


async def test_all_tags_kept_when_nothing_is_ignored(seeded_engine, session):
    with patch.object(
        artists_module,
        "get_top_tags",
        AsyncMock(return_value=[("metal", 456), ("thrash", 123)]),
    ):
        tags = await _tags("Ghost", session)

    assert tags == [("metal", 456), ("thrash", 123)]


async def test_tag_matching_against_ignored_list_is_exact(seeded_engine, session):
    # Only the exact-case tag is dropped; "rock" (lowercase) survives.
    with patch.object(
        artists_module,
        "get_top_tags",
        AsyncMock(return_value=[("rock", 100), ("Rock", 200), ("Metal", 300)]),
    ):
        tags = await _tags("Ghost", session)

    assert tags == [("rock", 100), ("Metal", 300)]


async def test_unknown_artist_returns_404(seeded_engine, session):
    with patch.object(
        artists_module,
        "get_top_tags",
        AsyncMock(return_value="The artist you supplied could not be found"),
    ):
        result = await _tags("No Such Band", session)

    assert result.status_code == status.HTTP_404_NOT_FOUND