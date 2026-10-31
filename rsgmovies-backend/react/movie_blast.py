import os
import time
import hmac
import hashlib
import base64
import logging
from urllib.parse import urlparse, quote
from django.http import JsonResponse
import requests
from activity.services import log_activity_event

logger = logging.getLogger(__name__)

def test(request):
    url = "https://net52.cc/mobile/home"
    params = {'app': '1'}
    headers = {
        'User-Agent': "Mozilla/5.0 (Linux; Android 13; GM1917 Build/TKQ1.221013.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/151.0.7922.199 Mobile Safari/537.36 /OS.Gatu v3.1",
        'Accept': "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        'accept-language': "en-IN,en-US;q=0.9,en;q=0.8"
    }

    session = requests.Session()
    response = session.get(url, params=params, headers=headers)
    html_data = response.text
    return JsonResponse({"status": "success", "data": html_data})

def _sort_mkv_streams(videos):
    """Prefer direct MKV streams so normal playback does not consume proxy bandwidth."""
    if not isinstance(videos, list):
        return videos

    def is_mkv(video):
        if not isinstance(video, dict):
            return False
        value = f"{video.get('link', '')} {video.get('filetype', '')} {video.get('ext', '')} {video.get('video_name', '')}".lower()
        return '.mkv' in value or 'mkv' in value

    return sorted(videos, key=lambda video: not is_mkv(video))

DOMAIN = os.getenv("MOVIE_BLAST_DOMAIN", "https://app.cloud-mb.xyz")
TOKEN = os.getenv("MOVIE_BLAST_TOKEN", "")
ENDPOINT_KEY = os.getenv("MOVIE_BLAST_KEY", "")
BLAST_SECRET_KEY = os.getenv("MOVIE_BLAST_SECRET_KEY", "")


def sign_blast_url(url_str: str) -> str:
    """
    Generates an HMAC-SHA256 signed URL for Blast media playback streams.
    Ensures https:// protocol and valid verify parameter for CDN access.
    """
    if not url_str:
        return ""
    try:
        raw_url = str(url_str).strip()
        if not raw_url.startswith("http://") and not raw_url.startswith("https://"):
            safe_url = f"https://{raw_url}"
        else:
            safe_url = raw_url.replace("http://", "https://")

        parsed = urlparse(safe_url)
        path = parsed.path
        timestamp = int(time.time())
        data_to_sign = f"{path}{timestamp}".encode('utf-8')

        mac = hmac.new(
            key=BLAST_SECRET_KEY.encode('utf-8'),
            msg=data_to_sign,
            digestmod=hashlib.sha256
        )
        raw_hmac = mac.digest()
        base64_hash = base64.b64encode(raw_hmac).decode('utf-8')
        url_encoded_hash = quote(base64_hash, safe='')

        delimiter = "&" if parsed.query else "?"
        return f"{safe_url}{delimiter}verify={timestamp}-{url_encoded_hash}"
    except Exception as e:
        logger.warning(f"Error signing Blast URL: {e}")
        return url_str if url_str.startswith("http") else f"https://{url_str}"


from django.core.cache import cache

def get_data(path, cache_ttl=1800):
    cache_key = f"movie_blast:{path}"
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return cached_data

    url = f"{DOMAIN}{path}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
        "Authorization": f"Bearer {TOKEN}"
    }
    try:
        res = requests.get(url, headers=headers, timeout=10)
        data = res.json()
        if cache_ttl > 0 and data:
            cache.set(cache_key, data, cache_ttl)
        return data
    except Exception as e:
        logger.error(f"Movie Blast request error for {path}: {e}")
        return {}


def configurations(r):
    return JsonResponse({
        "domain": DOMAIN,
        "endpoint": ENDPOINT_KEY,
        "token": TOKEN
    })


def home(r):
    return JsonResponse(get_data(f"/api/media/mobile/{ENDPOINT_KEY}"))


def pinned(r):
    page = r.GET.get('page', 1)
    return JsonResponse(get_data(f"/api/genres/pinned/all/{ENDPOINT_KEY}?page={page}"))


def new_hd(r):
    page = r.GET.get('page', 1)
    return JsonResponse(get_data(f"/api/genres/media/names/New%20HD%20Released/{ENDPOINT_KEY}?page={page}"))


def recently_added(r):
    page = r.GET.get('page', 1)
    return JsonResponse(get_data(f"/api/genres/new/all/{ENDPOINT_KEY}?page={page}"))


def latest_series_episodes(r):
    page = r.GET.get('page', 1)
    return JsonResponse(get_data(f"/api/media/seriesEpisodesAll/{ENDPOINT_KEY}?page={page}"))


def recommended(r):
    page = r.GET.get('page', 1)
    return JsonResponse(get_data(f"/api/genres/recommended/all/{ENDPOINT_KEY}?page={page}"))


def trending(r):
    page = r.GET.get('page', 1)
    return JsonResponse(get_data(f"/api/genres/trending/all/{ENDPOINT_KEY}?page={page}"))


def choosed(r):
    page = r.GET.get('page', 1)
    return JsonResponse(get_data(f"/api/genres/choosed/all/{ENDPOINT_KEY}?page={page}"))


def popular_series(r):
    page = r.GET.get('page', 1)
    return JsonResponse(get_data(f"/api/genres/popularseries/all/{ENDPOINT_KEY}?page={page}"))


def latest_series(r):
    page = r.GET.get('page', 1)
    return JsonResponse(get_data(f"/api/genres/latestseries/all/{ENDPOINT_KEY}?page={page}"))


def latest_movies(r):
    page = r.GET.get('page', 1)
    return JsonResponse(get_data(f"/api/genres/latestmovies/all/{ENDPOINT_KEY}?page={page}"))


def next_this_week(r):
    page = r.GET.get('page', 1)
    return JsonResponse(get_data(f"/api/genres/thisweek/all/{ENDPOINT_KEY}?page={page}"))


def most_popular(r):
    page = r.GET.get('page', 1)
    return JsonResponse(get_data(f"/api/genres/popularmovies/all/{ENDPOINT_KEY}?page={page}"))


def search(r):
    query = r.GET.get('query', '')
    if getattr(r, 'user', None) and r.user.is_authenticated and query:
        log_activity_event(
            event_type='MOVIE_SEARCHED',
            request=r,
            user=r.user,
            resource_type='MovieSearch',
            metadata={'query': str(query)}
        )
    return JsonResponse(get_data(f"/api/search/{query}/{ENDPOINT_KEY}"))


def movie_details(request, id):
    data = get_data(f"/api/media/detail/{id}/{ENDPOINT_KEY}")
    if isinstance(data, dict) and "videos" in data and isinstance(data["videos"], list):
        data["videos"] = _sort_mkv_streams(data["videos"])
        for vid in data["videos"]:
            if isinstance(vid, dict) and "link" in vid and vid["link"]:
                vid["link"] = sign_blast_url(vid["link"])
    if getattr(request, 'user', None) and request.user.is_authenticated and isinstance(data, dict):
        log_activity_event(
            event_type='MOVIE_VIEWED',
            request=request,
            user=request.user,
            resource_type='Movie',
            resource_id=str(id),
            metadata={'title': data.get('title', ''), 'id': str(id)}
        )
    return JsonResponse(data)


def series_details(r, id):
    data = get_data(f"/api/series/show/{id}/{ENDPOINT_KEY}")
    if isinstance(data, dict) and "seasons" in data and isinstance(data["seasons"], list):
        for season in data["seasons"]:
            for ep in season.get("episodes", []):
                ep["videos"] = _sort_mkv_streams(ep.get("videos", []))
                for vid in ep.get("videos", []):
                    if isinstance(vid, dict) and "link" in vid and vid["link"]:
                        vid["link"] = sign_blast_url(vid["link"])
    if getattr(r, 'user', None) and r.user.is_authenticated and isinstance(data, dict):
        log_activity_event(
            event_type='MOVIE_VIEWED',
            request=r,
            user=r.user,
            resource_type='Series',
            resource_id=str(id),
            metadata={'name': data.get('name', ''), 'id': str(id)}
        )
    return JsonResponse(data)


def genres(r):
    return JsonResponse(get_data(f"/api/genres/list/{ENDPOINT_KEY}"))


def movies_all(r):
    page = r.GET.get('page', 1)
    return JsonResponse(get_data(f"/api/genres/movies/all/{ENDPOINT_KEY}?page={page}"))


def movies_filter(r):
    page = r.GET.get('page', 1)
    sort = r.GET.get('filter', 'latestadded')
    return JsonResponse(get_data(f"/api/movies/{sort}/{ENDPOINT_KEY}?page={page}"))


def movies_genre(r, id):
    page = r.GET.get('page', 1)
    return JsonResponse(get_data(f"/api/genres/mediaLibrary/show/{id}/movie/{ENDPOINT_KEY}?page={page}"))


def series_all(r):
    page = r.GET.get('page', 1)
    return JsonResponse(get_data(f"/api/genres/series/all/{ENDPOINT_KEY}?page={page}"))


def series_filter(r):
    page = r.GET.get('page', 1)
    sort = r.GET.get('filter', 'latestadded')
    return JsonResponse(get_data(f"/api/series/{sort}/{ENDPOINT_KEY}?page={page}"))


def series_genre(r, id):
    page = r.GET.get('page', 1)
    return JsonResponse(get_data(f"/api/genres/mediaLibrary/show/{id}/serie/{ENDPOINT_KEY}?page={page}"))


def movie_related(request, id):
    data = get_data(f"/api/media/relateds/{id}/{ENDPOINT_KEY}")
    return JsonResponse(data)


def series_related(request, id):
    data = get_data(f"/api/series/relateds/{id}/{ENDPOINT_KEY}")
    return JsonResponse(data)


def cast_filmography(request, id):
    """
    Fetches person filmography directly from Movie Blast API (/api/filmographie/detail/{id}).
    """
    page = request.GET.get('page', 1)
    data = get_data(f"/api/filmographie/detail/{id}/{ENDPOINT_KEY}?page={page}")
    return JsonResponse(data, safe=False)


def configurations(request):
    """
    Returns app configuration for Android TV and client apps.
    """
    return JsonResponse({
        "domain": DOMAIN,
        "endpoint": ENDPOINT_KEY,
        "token": TOKEN,
        "decrypt": BLAST_SECRET_KEY
    })


