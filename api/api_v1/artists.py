from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import new_session
from models.artist import ArtistModel
from schemas.artist import ArtistRead

router = APIRouter(tags=["ARTISTS"])


async def get_session():
    async with new_session() as session:
        yield session


@router.get("/artists", response_model=list[ArtistRead])
async def get_artists(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(ArtistModel).order_by(ArtistModel.id))
    artists = result.scalars().all()
    return artists