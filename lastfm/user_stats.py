import httpx
from config import settings
from lastfm.get_artists import get_top_tags


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
