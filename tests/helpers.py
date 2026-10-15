"""Shared fakes for driving FastAPI endpoint functions without live services.

The endpoints under test are ordinary async functions that receive an
``AsyncSession`` (or something duck-typed like it) and use a module-global
Redis client. These helpers provide small in-memory stand-ins:

* :class:`FakeSession` executes SQLAlchemy statements against an in-memory
  SQLite engine and returns buffered results that survive the ``with`` block.
* :class:`FakeCache` records the writes a handler makes and answers the
  Redis name-index and 1-minute-dedup questions from constructor parameters.
"""

from datetime import datetime, timezone

from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker

from models.artist import ArtistModel


class BufferedScalars:
    """Stand-in for ``Result.scalars()`` produced after a real sync SELECT."""

    def __init__(self, scalars):
        self._scalars = list(scalars)

    def all(self):
        return self._scalars

    def scalar_one_or_none(self):
        return self._scalars[0] if self._scalars else None


class BufferedResult:
    """Stand-in for ``Result`` whose rows are pre-fetched as scalars."""

    def __init__(self, scalars):
        self._scalars = scalars

    def scalars(self):
        return BufferedScalars(self._scalars)

    def scalar_one_or_none(self):
        return self._scalars[0] if self._scalars else None


class FakeSession:
    """AsyncSession stand-in that runs statements on in-memory SQLite.

    A regular ORM ``Session`` is used per statement (not a raw connection) so
    entity loads are bundled the same way ``AsyncSession`` bundles them. Rows
    are buffered into memory before the caller consumes them, matching the
    async contract of ``AsyncSession.execute``.
    """

    def __init__(self, engine: Engine):
        self._Session = sessionmaker(bind=engine)

    async def execute(self, stmt, **kwargs):
        with self._Session() as session:
            result = session.execute(stmt, **kwargs)
            scalars = result.scalars().all()
        return BufferedResult(scalars)


class FakeCache:
    """Redis stand-in that records the writes artist handlers make.

    * ``recently_posted`` / ``cached_artist`` answer the 1-minute POST-dedup
      questions.
    * ``index_names`` are the members of the ``artist:index`` SET; cached
      payloads are gone by default, simulating expired TTL keys.
    """

    def __init__(self, *, recently_posted=False, cached_artist=None, index_names=None):
        self.recently_posted = recently_posted
        self.cached_artist = cached_artist
        self.index_names = list(index_names) if index_names is not None else []
        self.set_artist_calls = []
        self.set_artists_calls = []
        self.mark_posted_calls = []

    async def get_all_artist_names(self):
        return list(self.index_names)

    async def get_artists(self, names):
        return {}  # every artist key has expired -> no hits

    async def set_artists(self, artists):
        self.set_artists_calls.append(list(artists))

    async def is_recently_posted(self, name):
        return self.recently_posted

    async def get_artist(self, name):
        return self.cached_artist

    async def set_artist(self, artist):
        self.set_artist_calls.append(artist)

    async def delete_artist(self, name):
        pass

    async def mark_posted(self, name):
        self.mark_posted_calls.append(name)


def make_artist_dict(name: str, listeners: int, scrobbles: int, ratio: float) -> dict:
    """Artist row dict for seeding the ``artists`` table."""
    now = datetime.now(timezone.utc)
    return dict(
        name=name,
        listeners=listeners,
        scrobbles=scrobbles,
        ratio=ratio,
        created_at=now,
        updated_at=now,
    )


def make_artist_row(
    artist_id: int, name: str, listeners: int, scrobbles: int, ratio: float
) -> ArtistModel:
    """In-memory ``ArtistModel``, e.g. a mocked ``push_or_update`` return value."""
    now = datetime.now(timezone.utc)
    return ArtistModel(
        id=artist_id,
        name=name,
        listeners=listeners,
        scrobbles=scrobbles,
        ratio=ratio,
        created_at=now,
        updated_at=now,
    )