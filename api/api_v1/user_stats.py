from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from lastfm.user_stats import get_last_week_list
from schemas.user_stats import UserStatsCreate

router = APIRouter(tags=["USER_STATS"])

@router.get("/last_week")
async def get_artists_last_week(body: UserStatsCreate, session: AsyncSession = Depends(get_db)):
    week_info = await get_last_week_list(body.name)
    return week_info