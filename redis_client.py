"""Async Redis cache for artist data.

Stores serialized artist objects (id, name, listeners, scrobbles, ratio and
timestamps) under ``artist:<name_lower>``, a name index (Redis SET) under
``artist:index``, and a short-lived marker under ``posted:<name>`` used to
deduplicate repeated POST /artists calls for the same name within a 1-minute
window.

With the name index in place, ``GET /artists`` is served **entirely from Redis**:
PostgreSQL is only consulted for artist names missing from the cache (or when
Redis itself is unreachable).

Every public method degrades gracefully: if Redis is unreachable (or returns
garbage) callers simply fall back to the PostgreSQL database.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Any

import redis.asyncio as aioredis

from config import settings

logger = logging.getLogger("lcfa3.redis")

_REQUIRED_ARTIST_FIELDS = (
    "id",
    "name",
    "listeners",
    "scrobbles",
    "ratio",
    "created_at",
    "updated_at",
)


def _to_iso(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat()


class RedisClient:
    """Thin async wrapper around :mod:`redis.asyncio` with soft failures."""

    ARTIST_KEY_PREFIX = "artist:"
    POSTED_KEY_PREFIX = "posted:"
    INDEX_KEY = "artist:index"

    def __init__(
        self,
        host: str | None = None,
        port: int | None = None,
        db: int | None = None,
        artist_ttl_seconds: int | None = None,
        dedup_window_seconds: int | None = None,
    ):
        self._artist_ttl = (
            artist_ttl_seconds
            if artist_ttl_seconds is not None
            else settings.redis.artist_ttl_seconds
        )
        self._dedup_window = (
            dedup_window_seconds
            if dedup_window_seconds is not None
            else settings.redis.dedup_window_seconds
        )
        self._redis = aioredis.from_url(
            f"redis://{host or settings.redis.host}:"
            f"{port if port is not None else settings.redis.port}/"
            f"{db if db is not None else settings.redis.db}",
            decode_responses=True,
            encoding="utf-8",
            socket_timeout=2.0,
            socket_connect_timeout=2.0,
        )

    # ------------------------------------------------------------------
    # internal helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _artist_key(name: str) -> str:
        return f"{RedisClient.ARTIST_KEY_PREFIX}{name.strip().lower()}"

    @staticmethod
    def _posted_key(name: str) -> str:
        return f"{RedisClient.POSTED_KEY_PREFIX}{name.strip().lower()}"

    @classmethod
    def _serialize(cls, artist: Any) -> dict:
        if isinstance(artist, dict):
            return dict(artist)
        return {
            "id": artist.id,
            "name": artist.name,
            "listeners": artist.listeners,
            "scrobbles": artist.scrobbles,
            "ratio": artist.ratio,
            "created_at": _to_iso(artist.created_at),
            "updated_at": _to_iso(artist.updated_at),
        }

    @classmethod
    def _deserialize(cls, raw: str) -> dict:
        data = json.loads(raw)
        for field in _REQUIRED_ARTIST_FIELDS:
            if field not in data:
                raise ValueError(f"cached artist is missing '{field}'")
        data["created_at"] = datetime.fromisoformat(data["created_at"])
        data["updated_at"] = datetime.fromisoformat(data["updated_at"])
        return data

    # ------------------------------------------------------------------
    # connection
    # ------------------------------------------------------------------
    async def ping(self) -> bool:
        try:
            return bool(await self._redis.ping())
        except Exception as exc:  # noqa: BLE001 - Redis may be down; degrade.
            logger.warning("Redis ping failed: %s", exc)
            return False

    # ------------------------------------------------------------------
    # artist cache (listeners / scrobbles / ratio)
    # ------------------------------------------------------------------
    async def get_artist(self, name: str) -> dict | None:
        """Return cached artist as a dict, or None (also when Redis is down)."""
        try:
            raw = await self._redis.get(self._artist_key(name))
            if raw is None:
                return None
            return self._deserialize(raw)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Redis get_artist(%r) failed: %s", name, exc)
            return None

    async def get_all_artist_names(self) -> list[str] | None:
        """Return the artist-name index from Redis, or None if Redis is down."""
        try:
            names = await self._redis.smembers(self.INDEX_KEY)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Redis get_all_artist_names failed: %s", exc)
            return None
        return list(names)

    async def get_artists(self, names: list[str]) -> dict[str, dict]:
        """Bulk-fetch cached artists; returns {lowercased name: data} for hits."""
        if not names:
            return {}
        try:
            keys = [self._artist_key(name) for name in names]
            raw_values = await self._redis.mget(keys)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Redis get_artists failed: %s", exc)
            return {}
        hits: dict[str, dict] = {}
        for raw in raw_values:
            if raw is None:
                continue
            try:
                data = self._deserialize(raw)
                hits[data["name"].strip().lower()] = data
            except Exception as exc:  # noqa: BLE001
                logger.warning("Redis get_artists skipped a bad payload: %s", exc)
        return hits

    async def set_artist(self, artist: Any) -> None:
        """Cache one artist (SQLAlchemy model or dict) with a TTL + index it."""
        data = self._serialize(artist)
        try:
            await self._redis.set(
                self._artist_key(data["name"]),
                json.dumps(data, default=_to_iso),
                ex=self._artist_ttl,
            )
            await self._redis.sadd(self.INDEX_KEY, data["name"])
        except Exception as exc:  # noqa: BLE001
            logger.warning("Redis set_artist(%r) failed: %s", data.get("name"), exc)

    async def set_artists(self, artists: list[Any]) -> None:
        """Warm the cache for several artists in a single pipeline."""
        if not artists:
            return
        try:
            pipe = self._redis.pipeline()
            for artist in artists:
                data = self._serialize(artist)
                pipe.set(
                    self._artist_key(data["name"]),
                    json.dumps(data, default=_to_iso),
                    ex=self._artist_ttl,
                )
                pipe.sadd(self.INDEX_KEY, data["name"])
            await pipe.execute()
        except Exception as exc:  # noqa: BLE001
            logger.warning("Redis set_artists(pipeline) failed: %s", exc)

    async def delete_artist(self, name: str) -> None:
        """Drop cache entry, dedup marker and the name-index member."""
        try:
            await self._redis.delete(self._artist_key(name), self._posted_key(name))
            await self._redis.srem(self.INDEX_KEY, name)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Redis delete_artist(%r) failed: %s", name, exc)

    # ------------------------------------------------------------------
    # 1-minute POST dedup marker
    # ------------------------------------------------------------------
    async def mark_posted(self, name: str) -> None:
        """Remember that this artist was just upserted (dedup window begins)."""
        try:
            await self._redis.set(self._posted_key(name), "1", ex=self._dedup_window)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Redis mark_posted(%r) failed: %s", name, exc)

    async def is_recently_posted(self, name: str) -> bool:
        """True if the same artist was upserted within the dedup window."""
        try:
            return bool(await self._redis.exists(self._posted_key(name)))
        except Exception as exc:  # noqa: BLE001
            logger.warning("Redis is_recently_posted(%r) failed: %s", name, exc)
            return False


cache = RedisClient()