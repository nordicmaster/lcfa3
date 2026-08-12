import httpx
from schemas.artist import ArtistWrite
from config import settings


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
