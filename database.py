from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

engine = create_async_engine("postgresql+asyncpg://admin:admin@db:5432/lc")

new_session = async_sessionmaker(engine, expire_on_commit=False)