from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime, Float
from sqlalchemy.orm import DeclarativeBase, mapped_column, Mapped
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


class ArtistModel(Base):
    __tablename__ = "artists"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(nullable=False)
    listeners: Mapped[int] = mapped_column(nullable=False)
    scrobbles: Mapped[int] = mapped_column(nullable=False)
    ratio: Mapped[float] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())