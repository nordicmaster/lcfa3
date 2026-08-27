from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status, Response, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert

from database import get_db
from lastfm.get_artists import get_lastfm_info, get_top_tags
from models.artist import ArtistModel
from models.ignored_tag import IgnoredTagModel
from schemas.artist import ArtistCreate, ArtistRead
from schemas.tag import IgnoredTagCreate, IgnoredTagRead

router = APIRouter(tags=["ARTISTS"])


SORTABLE_COLUMNS = {
    "id": ArtistModel.id,
    "name": ArtistModel.name,
    "listeners": ArtistModel.listeners,
    "scrobbles": ArtistModel.scrobbles,
    "ratio": ArtistModel.ratio,
    "created_at": ArtistModel.created_at,
    "updated_at": ArtistModel.updated_at,
}


@router.get("", response_model=list[ArtistRead])
async def get_artists(
    sort_by: str = Query("ratio", pattern="^(id|name|listeners|scrobbles|ratio|created_at|updated_at)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    session: AsyncSession = Depends(get_db),
):
    column = SORTABLE_COLUMNS[sort_by]
    order_column = column.desc() if order == "desc" else column.asc()
    result = await session.execute(select(ArtistModel).order_by(order_column))
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

    stmt = insert(ArtistModel).values(
        name=lastfm_artist.name,
        listeners=lastfm_artist.listeners,
        scrobbles=lastfm_artist.scrobbles,
        ratio=lastfm_artist.ratio,
        updated_at=datetime.now(timezone.utc),
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=[ArtistModel.name],
        set_={
            "listeners": stmt.excluded.listeners,
            "scrobbles": stmt.excluded.scrobbles,
            "ratio": stmt.excluded.ratio,
            "updated_at": stmt.excluded.updated_at,
        },
    ).returning(ArtistModel)
    result = await session.execute(stmt)
    artist = result.scalar_one()
    await session.commit()
    return artist


@router.delete("/{artist_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_artist(artist_id: int, session: AsyncSession = Depends(get_db)):
    result = await session.execute(
        select(ArtistModel).where(ArtistModel.id == artist_id)
    )
    artist = result.scalar_one_or_none()
    if artist is None:
        return Response(
            content="Artist not found", status_code=status.HTTP_404_NOT_FOUND
        )
    await session.delete(artist)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


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


@router.get("/tags/ignored", response_model=list[IgnoredTagRead])
async def get_ignored_tags(session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(IgnoredTagModel).order_by(IgnoredTagModel.id))
    return result.scalars().all()


@router.post("/tags/ignored", response_model=IgnoredTagRead, status_code=status.HTTP_201_CREATED)
async def create_ignored_tag(
    body: IgnoredTagCreate,
    session: AsyncSession = Depends(get_db),
):
    name = body.name.strip()
    if not name:
        return Response(
            content="Tag name must not be empty",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
    result = await session.execute(select(IgnoredTagModel).where(IgnoredTagModel.name == name))
    existing = result.scalar_one_or_none()
    if existing is not None:
        return Response(
            content="Tag already ignored", status_code=status.HTTP_409_CONFLICT
        )
    ignored_tag = IgnoredTagModel(name=name)
    session.add(ignored_tag)
    await session.commit()
    await session.refresh(ignored_tag)
    return ignored_tag


@router.delete("/tags/ignored/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ignored_tag(tag_id: int, session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(IgnoredTagModel).where(IgnoredTagModel.id == tag_id))
    ignored_tag = result.scalar_one_or_none()
    if ignored_tag is None:
        return Response(
            content="Ignored tag not found", status_code=status.HTTP_404_NOT_FOUND
        )
    await session.delete(ignored_tag)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
