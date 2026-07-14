from contextlib import asynccontextmanager
from datetime import datetime

import uvicorn
from authx import AuthX, AuthXConfig
from fastapi import FastAPI, Depends
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from api import router as api_router
from create_fastapi_app import create_app
from models.artist import Base

app = create_app(create_custom_static_urls=True)

engine = create_async_engine("postgresql+asyncpg://admin:admin@db:5432/lc")  # postgre

new_session = async_sessionmaker(engine, expire_on_commit=False)

config = AuthXConfig(
    JWT_SECRET_KEY="your-secret-key0",  # Change this!
    JWT_TOKEN_LOCATION=["headers"],
)

auth = AuthX(config=config)
auth.handle_errors(app)

app.include_router(api_router)


@app.get("/protected", dependencies=[Depends(auth.access_token_required)])
def protected():
    return {"message": "Protected Hello World"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


uvicorn.run(
    app,
    host="0.0.0.0",
    port=8000
)
