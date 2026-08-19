import logging
import time

from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

logger = logging.getLogger("lcfa3.db")

engine = create_async_engine("postgresql+asyncpg://admin:admin@db:5432/lc")

new_session = async_sessionmaker(engine, expire_on_commit=False)


def _before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    conn.info.setdefault("_query_start_time", []).append(time.perf_counter())


def _after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    start_times = conn.info.setdefault("_query_start_time", [])
    if start_times:
        start_time = start_times.pop()
        elapsed_ms = (time.perf_counter() - start_time) * 1000

        if context is not None and context.compiled is not None:
            statement = context.compiled.string

        logger.info(
            "Query executed in %.2f ms: %s",
            elapsed_ms,
            " ".join(statement.split()),
        )


event.listen(engine.sync_engine, "before_cursor_execute", _before_cursor_execute)
event.listen(engine.sync_engine, "after_cursor_execute", _after_cursor_execute)


async def get_db() -> AsyncSession:
    async with new_session() as session:
        try:
            yield session
        finally:
            await session.close()
