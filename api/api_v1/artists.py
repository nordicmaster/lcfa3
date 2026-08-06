from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.artist import ArtistModel
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
    result = await session.execute(
        select(ArtistModel).where(ArtistModel.name == body.name)
    )
    artist = result.scalar_one_or_none()

    if artist is None:
        artist = ArtistModel(
            name=body.name,
            listeners=0,
            scrobbles=0,
            ratio=0.0,
        )
        session.add(artist)
    else:
        artist.name = body.name
        artist.listeners = 0
        artist.scrobbles = 0
        artist.ratio = 0.0

    await session.commit()
    await session.refresh(artist)
    return artist
