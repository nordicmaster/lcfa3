from sqlalchemy import String
from sqlalchemy.orm import mapped_column, Mapped

from .base import Base


class IgnoredTagModel(Base):
    __tablename__ = "ignored_tags"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)