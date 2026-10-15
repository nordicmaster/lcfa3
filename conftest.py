"""Shared pytest fixtures for the offline endpoint tests.

Every test gets a function-scoped, in-memory SQLite engine with the whole
schema created, plus duck-typed stand-ins for the async session and the Redis
client. Test modules that need existing rows seed the ``engine`` fixture and
request it under a local name (e.g. ``seeded_engine``); the shared ``session``
fixture resolves to the same engine instance thanks to fixture caching, so no
live PostgreSQL/Redis is required anywhere in the suite.
"""

import pytest
from sqlalchemy import create_engine

from models.base import Base

from tests.helpers import FakeCache, FakeSession


@pytest.fixture
def engine():
    """In-memory SQLite engine with the full schema; disposed after the test."""
    eng = create_engine("sqlite://")
    Base.metadata.create_all(eng)
    yield eng
    eng.dispose()


@pytest.fixture
def session(engine):
    """AsyncSession stand-in bound to the per-test engine."""
    return FakeSession(engine)


@pytest.fixture
def cache():
    """Redis stand-in that records the writes artist handlers make."""
    return FakeCache()