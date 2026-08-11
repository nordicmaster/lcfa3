from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from lastfm.get_artists import get_lastfm_info, get_top_tags
from models.artist import ArtistModel
from models.ignored_tag import IgnoredTagModel
from schemas.artist import ArtistCreate, ArtistRead

router = APIRouter(tags=["ARTISTS"])


@router.get("", response_model=list[ArtistRead])
async def get_artists(session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(ArtistModel).order_by(ArtistModel.id))
    artists = result.scalars().all()
    return artists


@router.post("", response_model=ArtistRead)
async def create_or_override_artist(
    body: ArtistCreate,
    session: AsyncSession = Depends(get_db),
):
    lastfm_artist = await get_lastfm_info(body.name)
    if isinstance(lastfm_artist, str):
        print(f"{body.name} -- {lastfm_artist}")
        return Response(content=lastfm_artist, status_code=status.HTTP_404_NOT_FOUND)
    result = await session.execute(
        select(ArtistModel).where(ArtistModel.name == body.name)
    )
    artist = result.scalar_one_or_none()

    if artist is None:
        artist = ArtistModel(
            name=lastfm_artist.name,
            listeners=lastfm_artist.listeners,
            scrobbles=lastfm_artist.scrobbles,
            ratio=lastfm_artist.ratio,
            updated_at=datetime.now(timezone.utc),
        )
        session.add(artist)
    else:
        artist.name = lastfm_artist.name
        artist.listeners = lastfm_artist.listeners
        artist.scrobbles = lastfm_artist.scrobbles
        artist.ratio = lastfm_artist.ratio

    await session.commit()
    await session.refresh(artist)
    return artist


@router.get("/tags")
async def get_artists_tags(name: str, session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(IgnoredTagModel))
    ig_tags = result.scalars().all()
    ig_tags_list = [x.name for x in ig_tags]

    tags_from_lastfm = await get_top_tags(name)
    if isinstance(tags_from_lastfm, str):
        return Response(
            content=tags_from_lastfm, status_code=status.HTTP_404_NOT_FOUND
        )
    filtered_tags_from_lastfm = []
    for t in tags_from_lastfm:
        if t[0] not in ig_tags_list:
            filtered_tags_from_lastfm.append(t)

    return filtered_tags_from_lastfm
