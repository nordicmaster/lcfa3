from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ArtistRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    listeners: int
    scrobbles: int
    ratio: float
    created_at: datetime
    updated_at: datetime


class ArtistWrite(BaseModel):
    name: str
    listeners: int
    scrobbles: int
    ratio: float