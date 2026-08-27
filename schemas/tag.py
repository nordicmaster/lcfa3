from pydantic import BaseModel, ConfigDict


class TagRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    count: int


class IgnoredTagRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class IgnoredTagCreate(BaseModel):
    name: str
