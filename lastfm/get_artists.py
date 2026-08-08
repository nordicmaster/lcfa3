import httpx
from schemas.artist import ArtistWrite
from config import settings


async def get_lastfm_info(name: str) -> ArtistWrite | str:
    """ Gets Artist.GetInfo for specified artist"""
    myobj = {'method': 'artist.getinfo',
             'artist': name,
             'api_key': settings.lastfm.api_key,
             'format': 'json'}
    async with httpx.AsyncClient() as client:
        response = await client.get(url=settings.lastfm.base_url, params=myobj, timeout=10.0)
        x_info = response.json()
        if 'error' in x_info:
            return x_info["message"]
        listeners = x_info["artist"]["stats"]["listeners"]
        totalscrobbles = x_info["artist"]["stats"]["playcount"]
        new_artist = ArtistWrite(
            name=name,
            scrobbles=totalscrobbles,
            listeners=listeners,
            ratio=float(totalscrobbles) / float(listeners)
        )
    return new_artist


async def get_top_tags(artist: str) -> list[tuple[str, int]] | str:
    """ Gets Artist.GetTopTags for specified artist"""
    myobj = {'method': 'artist.gettoptags',
             'artist': artist,
             'api_key': settings.lastfm.api_key,
             'format': 'json'}
    async with httpx.AsyncClient() as client:
        response = await client.get(url=settings.lastfm.base_url, params=myobj, timeout=10.0)
        x_info = response.json()
        if 'error' in x_info:
            return x_info["message"]
        tags = x_info["toptags"]["tag"]
        result = []
        for tag in tags:
            if tag["count"] > 20:
                result.append((str(tag["name"]), tag["count"]))
    return result
