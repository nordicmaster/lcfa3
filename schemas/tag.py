from pydantic import BaseModel, ConfigDict


class TagRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    count: int
