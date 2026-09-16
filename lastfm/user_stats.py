import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from lastfm.get_artists import get_lastfm_info, get_top_tags
from lastfm.update_artist import push_or_update


async def get_last_week_list(name: str) -> list[tuple[str, int]] | str:
    """ Gets User.GetWeeklyArtistChart for specified user"""
    myobj = {'method': 'user.getWeeklyArtistChart',
             'user': name,
             'api_key': settings.lastfm.api_key,
             'format': 'json'}
    result = []
    async with httpx.AsyncClient() as client:
        response = await client.get(url=settings.lastfm.base_url, params=myobj, timeout=10.0)
        x_info = response.json()
        if 'error' in x_info:
            return x_info["message"]
        week_artists = x_info["weeklyartistchart"]["artist"]
        for art in week_artists:
            result.append((art["name"], art["playcount"]))
    return result


async def get_top_tags_by_user(username: str, period: str = 'overall') -> list[tuple[str, float]] | str:
    """ Gets User.GetTopArtists by period and calculates user's top tags"""
    myobj = {'method': 'user.getTopArtists',
             'period': period,
             'user': username,
             'api_key': settings.lastfm.api_key,
             'format': 'json'}
    async with httpx.AsyncClient() as client:
        response = await client.get(url=settings.lastfm.base_url, params=myobj, timeout=10.0)
        x_info = response.json()
        if 'error' in x_info:
            return x_info["message"]
        top_artists = x_info["topartists"]["artist"]
        result = []
        for art in top_artists:
            tags = await get_top_tags(art["name"])
            if isinstance(tags, str):
                continue
            playcount = int(art["playcount"])
            for tag_name, tag_count in tags:
                found = False
                for index, (existing_name, existing_count) in enumerate(result):
                    if existing_name == tag_name:
                        result[index] = (tag_name, existing_count + tag_count * playcount)
                        found = True
                        break
                if not found:
                    result.append((tag_name, tag_count * playcount))
        result.sort(key=lambda tag: tag[1], reverse=True)
        all_tagcount = sum(tag_count for _, tag_count in result)
        result = [(tag_name, 100 * tag_count / all_tagcount) for tag_name, tag_count in result]
    return result


async def get_library_of_user(username: str) -> list[dict] | None:
    """ Gets library.getArtists (up to 1500 artists) for specified user.

    Returns the raw ``artists.artist`` list from Last.fm, or ``None`` when the
    request failed (unknown user, API error, network problem). Callers treat a
    ``None`` library as "no overall scrobbles data".
    """
    myobj = {'method': 'library.getArtists',
             'user': username,
             'limit': 1500,
             'api_key': settings.lastfm.api_key,
             'format': 'json'}
    async with httpx.AsyncClient() as client:
        response = await client.get(url=settings.lastfm.base_url, params=myobj, timeout=10.0)
        x_info = response.json()
        if 'error' in x_info:
            return None
        return x_info["artists"]["artist"]


def get_scrobbles_of_certain_artist_in_library(library: list[dict] | None, name: str) -> int:
    """ Return the overall playcount of ``name`` in the user's library, or 0.

    A falsy library (fetch failed / empty) yields 0, mirroring the legacy
    ``if library == 0: return 0`` behaviour.
    """
    if not library:
        return 0
    for artist in library:
        if artist["name"] == name:
            return int(artist["playcount"])
    return 0


async def get_top_artists(
    username: str,
    period: str = 'overall',
    session: AsyncSession | None = None,
) -> list[tuple[str, int, int]] | str:
    """ Gets User.GetTopArtists for specified user by period.

    Returns ``(artist name, playcount in the period, overall library playcount)``
    triples. If a ``session`` is given, fresh listeners/scrobbles/ratio are pulled
    for every artist and persisted via :func:`push_or_update` (the legacy
    ``MyWeekArtistInfo`` list). A failed library read leaves the overall counts at
    0. Last.fm errors are returned as a message string.
    """
    myobj = {'method': 'user.getTopArtists',
             'period': period,
             'user': username,
             'api_key': settings.lastfm.api_key,
             'format': 'json'}
    async with httpx.AsyncClient() as client:
        response = await client.get(url=settings.lastfm.base_url, params=myobj, timeout=10.0)
        x_info = response.json()
        if 'error' in x_info:
            return x_info["message"]
        top_artists = x_info["topartists"]["artist"]
        library = await get_library_of_user(username)
        result = []
        for art in top_artists:
            result.append((
                art["name"],
                int(art["playcount"]),
                get_scrobbles_of_certain_artist_in_library(library, art["name"]),
            ))
            if session is not None:
                upd_artist = await get_lastfm_info(art["name"])
                if not isinstance(upd_artist, str):
                    await push_or_update(session, upd_artist)
        return result
