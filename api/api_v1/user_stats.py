from fastapi import APIRouter, Depends, status, Response, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from lastfm.user_stats import get_last_week_list, get_top_artists, get_top_tags_by_user
from models.ignored_tag import IgnoredTagModel
from schemas.user_stats import UserStatsCreate

router = APIRouter(tags=["USER_STATS"])


@router.post("/last_week")
async def get_artists_last_week(body: UserStatsCreate, session: AsyncSession = Depends(get_db)):
    week_info = await get_last_week_list(body.name)
    return week_info


@router.post("/top_tags")
async def get_user_top_tags(
    body: UserStatsCreate,
    period: str = Query("overall", pattern="^(overall|7day|1month|3month|6month|12month)$"),
    session: AsyncSession = Depends(get_db),
):
    tags_info = await get_top_tags_by_user(body.name, period)
    if isinstance(tags_info, str):
        return Response(content=tags_info, status_code=status.HTTP_404_NOT_FOUND)

    result = await session.execute(select(IgnoredTagModel))
    ignored_tags = result.scalars().all()
    ignored_tag_names = {tag.name for tag in ignored_tags}
    tags_info = [tag for tag in tags_info if tag[0] not in ignored_tag_names]
    return tags_info


@router.post("/top_artists")
async def get_user_top_artists(
    body: UserStatsCreate,
    period: str = Query("overall", pattern="^(overall|7day|1month|3month|6month|12month)$"),
    session: AsyncSession = Depends(get_db),
):
    artists_info = await get_top_artists(body.name, period, session)
    if isinstance(artists_info, str):
        return Response(content=artists_info, status_code=status.HTTP_404_NOT_FOUND)
    return artists_info
