from pydantic import BaseModel

class UserStatsCreate(BaseModel):
    name: str