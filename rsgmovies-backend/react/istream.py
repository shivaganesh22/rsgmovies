import base64
import json
import logging
import urllib.parse
import xml.etree.ElementTree as ET
from django.http import JsonResponse, HttpResponse, StreamingHttpResponse
from django.core.cache import cache
import requests
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from activity.services import log_activity_event

import os

logger = logging.getLogger(__name__)

KEY = bytes.fromhex(os.getenv("ISTREAM_AES_KEY", "b35e6555ed48c0ade48c10bc1d4030cf9cc5768bff444a959048ce9a228b5746"))
BASE_URL = os.getenv("ISTREAM_PANEL_URL", "https://panel.hippitunes.pro/android/")
STREAM_URL_PREFIX = os.getenv("ISTREAM_STREAM_URL_PREFIX", "http://exposeworld.art/oxx/ox.php?id=")
HEADERS = {
    "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 13; GM1917 Build/TKQ1.221013.002)",
    "Connection": "Keep-Alive",
    "Accept-Encoding": "gzip",
    "x-api-key": os.getenv("ISTREAM_API_KEY", "kC7V1f8QRaZyvYnh"),
}

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

session = requests.Session()
from requests.adapters import HTTPAdapter
adapter = HTTPAdapter(
    pool_connections=100,
    pool_maxsize=100,
    max_retries=2,
    pool_block=False
)
session.mount("https://", adapter)
session.mount("http://", adapter)
session.headers.update({
    "User-Agent": USER_AGENT,
    "Connection": "keep-alive",
})

def decrypt_payload(payload):
    """Decrypt AES-GCM encrypted payload from panel.hippitunes.pro."""
    raw_b64 = payload
    if isinstance(payload, dict):
        raw_b64 = payload.get("data", payload)
        if isinstance(raw_b64, dict):
            raw_b64 = raw_b64.get("data", "")

    if not raw_b64:
        return {}

    raw_bytes = base64.b64decode(raw_b64)
    iv = raw_bytes[:12]
    tag = raw_bytes[12:28]
    ciphertext = raw_bytes[28:]
    decrypted_bytes = AESGCM(KEY).decrypt(iv, ciphertext + tag, None)
    return json.loads(decrypted_bytes.decode("utf-8"))


def fetch_istream_data(endpoint, method="GET", body=None, cache_ttl=300):
    """
    High-performance fetch wrapper with Django caching.
    Caches responses to minimize upstream load and speed up client requests.
    """
    cache_key = f"istream:{endpoint}:{method}:{hash(str(body))}"
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return cached_data

    url = endpoint if endpoint.startswith("http") else BASE_URL + endpoint
    try:
        if method.upper() == "POST":
            res = requests.post(url, headers=HEADERS, data=body or {}, timeout=15)
        else:
            res = requests.get(url, headers=HEADERS, timeout=15)
            if res.status_code == 405:
                res = requests.post(url, headers=HEADERS, data=body or {}, timeout=15)

        res.raise_for_status()
        raw_json = res.json()
        decrypted = decrypt_payload(raw_json)
        
        if cache_ttl > 0:
            cache.set(cache_key, decrypted, cache_ttl)
        return decrypted
    except Exception as error:
        logger.error(f"iStreamFlare request error for {endpoint}: {error}")
        return {}


# ----------------------------------------------------------------------
# API Views
# ----------------------------------------------------------------------

def home_slider(request):
    """Hero custom image slider banner."""
    return JsonResponse(fetch_istream_data("getCustomImageSlider", cache_ttl=300), safe=False)


def networks(request):
    """List of networks with icons."""
    return JsonResponse(fetch_istream_data("getNetworks", cache_ttl=600), safe=False)


def network_content(request, id):
    """All media for a given network ID."""
    return JsonResponse(fetch_istream_data(f"getAllContentsOfNetwork/{id}", cache_ttl=300), safe=False)


def live_tv_genres(request):
    """Live TV genre list."""
    return JsonResponse(fetch_istream_data("getLiveTvGenreList", cache_ttl=600), safe=False)


def live_tv_by_genre(request, genre):
    """Live TV channels by genre."""
    return JsonResponse(fetch_istream_data(f"getLiveTvReletedToGenre/{genre}", cache_ttl=300), safe=False)


def live_tv_details(request, id):
    """Live TV channel details."""
    return JsonResponse(fetch_istream_data(f"getLiveTVDetails/{id}", cache_ttl=300), safe=False)


def featured_live_tv(request):
    """Featured Live TV channels."""
    return JsonResponse(fetch_istream_data("getFeaturedLiveTV", cache_ttl=300), safe=False)


def all_live_tv(request):
    """All Live TV channels for View All."""
    return JsonResponse(fetch_istream_data("getAllLiveTV", cache_ttl=300), safe=False)


def trending(request):
    """Top 10 Trending items."""
    return JsonResponse(fetch_istream_data("getTrending", cache_ttl=300), safe=False)


def most_watched_movies(request):
    """Most watched movies."""
    return JsonResponse(fetch_istream_data("getMostWatched/Movies/10", cache_ttl=300), safe=False)


def most_watched_series(request):
    """Most watched web series."""
    return JsonResponse(fetch_istream_data("getMostWatched/WebSeries/10", cache_ttl=300), safe=False)


def because_watched_movies(request, id):
    """Recommendations based on watched movie."""
    return JsonResponse(fetch_istream_data(f"beacauseYouWatched/Movies/{id}/10", cache_ttl=300), safe=False)


def because_watched_series(request, id):
    """Recommendations based on watched series."""
    return JsonResponse(fetch_istream_data(f"beacauseYouWatched/WebSeries/{id}/10", cache_ttl=300), safe=False)


def recent_movies(request):
    """Recent movies section."""
    return JsonResponse(fetch_istream_data("getRecentContentList/Movies", cache_ttl=300), safe=False)


def recent_series(request):
    """Recent series section."""
    return JsonResponse(fetch_istream_data("getRecentContentList/WebSeries", cache_ttl=300), safe=False)


def most_searched(request):
    """Most searched items."""
    return JsonResponse(fetch_istream_data("getMostSearched", cache_ttl=300), safe=False)


def genre_list(request):
    """Round genre list icons."""
    return JsonResponse(fetch_istream_data("getGenreList", cache_ttl=600), safe=False)


def contents_by_genre(request, genre):
    """Media items related to genre."""
    return JsonResponse(fetch_istream_data(f"getContentsReletedToGenre/{genre}", cache_ttl=300), safe=False)


def rand_movies(request):
    """Random movies section."""
    return JsonResponse(fetch_istream_data("getRandMovies", cache_ttl=300), safe=False)


def rand_series(request):
    """Random web series section."""
    return JsonResponse(fetch_istream_data("getRandWebSeries", cache_ttl=300), safe=False)


def all_movies(request, page=1):
    """Paginated list of all movies."""
    return JsonResponse(fetch_istream_data(f"getAllMovies/{page}", cache_ttl=300), safe=False)


def all_series(request, page=1):
    """Paginated list of all web series."""
    return JsonResponse(fetch_istream_data(f"getAllWebSeries/{page}", cache_ttl=300), safe=False)


def movie_details(request, id):
    """Movie details page with activity logging."""
    data = fetch_istream_data(f"getMovieDetails/{id}", cache_ttl=300)
    
    if getattr(request, 'user', None) and request.user.is_authenticated and isinstance(data, dict):
        title = data.get('name') or data.get('title') or data.get('title_name') or ''
        log_activity_event(
            event_type='MOVIE_VIEWED',
            request=request,
            user=request.user,
            resource_type='iStreamMovie',
            resource_id=str(id),
            metadata={'title': title, 'id': str(id), 'source': 'iStreamFlare'}
        )
    return JsonResponse(data, safe=False)


def movie_play_links(request, id):
    """Streaming play links for movie."""
    return JsonResponse(fetch_istream_data(f"getMoviePlayLinks/{id}/0", cache_ttl=300), safe=False)


def series_details(request, id):
    """Web series details page with activity logging."""
    data = fetch_istream_data(f"getWebSeriesDetails/{id}", cache_ttl=300)
    
    if getattr(request, 'user', None) and request.user.is_authenticated and isinstance(data, dict):
        title = data.get('name') or data.get('title') or data.get('title_name') or ''
        log_activity_event(
            event_type='MOVIE_VIEWED',
            request=request,
            user=request.user,
            resource_type='iStreamSeries',
            resource_id=str(id),
            metadata={'title': title, 'id': str(id), 'source': 'iStreamFlare'}
        )
    return JsonResponse(data, safe=False)


def series_seasons(request, id):
    """Seasons list for web series."""
    return JsonResponse(fetch_istream_data(f"getSeasons/{id}", cache_ttl=300), safe=False)


def series_episodes(request, season_id):
    """Episodes list for a given season."""
    return JsonResponse(fetch_istream_data(f"getEpisodes/{season_id}/0", cache_ttl=300), safe=False)


def related_movies(request, id):
    """Related movies for movie detail page."""
    data = fetch_istream_data(f"getMovieDetails/{id}", cache_ttl=300)
    genres = ""
    if isinstance(data, dict):
        genres = data.get("genres") or data.get("genre") or "Drama,Romance"
    body = {"genres": genres}
    return JsonResponse(fetch_istream_data(f"getRelatedMovies/{id}/10", method="POST", body=body, cache_ttl=300), safe=False)


def related_series(request, id):
    """Related web series for series detail page."""
    data = fetch_istream_data(f"getWebSeriesDetails/{id}", cache_ttl=300)
    genres = ""
    if isinstance(data, dict):
        genres = data.get("genres") or data.get("genre") or "Drama,Romance"
    body = {"genres": genres}
    return JsonResponse(fetch_istream_data(f"getRelatedWebseries/{id}/10", method="POST", body=body, cache_ttl=300), safe=False)


def search(request):
    """Content search with activity logging."""
    query = request.GET.get('query', '')
    page = request.GET.get('page', 1)
    if getattr(request, 'user', None) and request.user.is_authenticated and query:
        log_activity_event(
            event_type='MOVIE_SEARCHED',
            request=request,
            user=request.user,
            resource_type='iStreamSearch',
            metadata={'query': str(query), 'source': 'iStreamFlare'}
        )
    if not query:
        return JsonResponse([], safe=False)
    return JsonResponse(fetch_istream_data(f"searchContent/{query}/{page}", cache_ttl=120), safe=False)
from django.http import JsonResponse, HttpResponse, StreamingHttpResponse

# ----------------------------------------------------------------------
# DASH Manifest Stream Proxy & M3U Playlist Generator
# ----------------------------------------------------------------------

def encode_b64(text: str) -> str:
    """Encodes arbitrary URL text to URL-safe base64 without padding."""
    return base64.urlsafe_b64encode(text.encode("utf-8")).decode("utf-8").rstrip("=")


def decode_b64(encoded: str) -> str:
    """Restores padding and decodes URL-safe base64."""
    padding = 4 - (len(encoded) % 4)
    if padding != 4:
        encoded += "=" * padding
    return base64.urlsafe_b64decode(encoded.encode("utf-8")).decode("utf-8")


def resolve_source_url(target_url, video_id):
    """Dynamically resolves upstream source URL for any media ID or target URL."""
    target = (target_url or "").strip()
    vid = (video_id or "").strip()
    raw = target or vid

    # Extract target URL if nested inside query string e.g. /react/istream/manifest/?id=https://... or ?url=https://...
    if "id=http" in raw:
        raw = raw.rsplit("id=", 1)[-1]
        raw = urllib.parse.unquote(raw)
    elif "url=http" in raw:
        raw = raw.rsplit("url=", 1)[-1]
        raw = urllib.parse.unquote(raw)

    # Clean any trailing query parameters like &proxy=1, &proxy=0, ?proxy=1, ?proxy=0
    if "&proxy=" in raw:
        raw = raw.split("&proxy=")[0]
    if "?proxy=" in raw and not "id=" in raw:
        raw = raw.split("?proxy=")[0]

    raw = raw.strip()

    if raw.startswith("http://") or raw.startswith("https://"):
        return raw

    clean_id = raw.replace("istream_", "").strip()
    if "id=" in clean_id:
        clean_id = clean_id.rsplit("id=", 1)[-1].split("&")[0]

    if clean_id:
        return f"{STREAM_URL_PREFIX}{clean_id}"

    return ""


def vlc_info(request):
    """Returns direct CDN manifest URL and local proxy manifest URL."""
    target_url = request.GET.get('url', '')
    raw_video_id = request.GET.get('id', '')
    source_url = resolve_source_url(target_url, raw_video_id)
    if not source_url:
        return JsonResponse({"error": "Missing url or id parameter"}, status=400)

    try:
        resp = session.get(source_url, allow_redirects=True, timeout=12)
        direct_cdn_manifest = resp.url
    except Exception:
        direct_cdn_manifest = source_url

    encoded_url = urllib.parse.quote(source_url, safe="")
    proxy_manifest = request.build_absolute_uri(f"/react/istream/manifest/?url={encoded_url}")

    return JsonResponse({
        "direct_url": direct_cdn_manifest,
        "proxy_url": proxy_manifest
    })


def manifest_proxy(request):
    """
    Proxy view serving rewritten MPD manifests with full CORS headers.
    Embeds CDN base dynamically into rewritten BaseURL for stateless segment routing.
    """
    target_url = request.GET.get('url', '')
    raw_video_id = request.GET.get('id', '')

    source_url = resolve_source_url(target_url, raw_video_id)
    if not source_url:
        return HttpResponse("Missing url or id parameter", status=400)

    try:
        resp = session.get(source_url, allow_redirects=True, timeout=12)
        if resp.status_code != 200 or not resp.text:
            return HttpResponse("Failed to fetch manifest from upstream", status=502)

        final_url = resp.url
        raw_mpd = resp.text

        # Extract base CDN directory up to /ondemand/
        if "/ondemand/" in final_url:
            cdn_base = final_url.split("/ondemand/")[0] + "/ondemand/"
        else:
            parsed = urllib.parse.urlparse(final_url)
            cdn_base = f"{parsed.scheme}://{parsed.netloc}{parsed.path.rsplit('/', 1)[0]}/"

        # Embed the CDN base directly into the rewritten BaseURL (stateless proxy)
        encoded_cdn = encode_b64(cdn_base)
        proxy_base = f"/react/istream/proxy/{encoded_cdn}/"

        ET.register_namespace("", "urn:mpeg:DASH:schema:MPD:2011")
        try:
            root = ET.fromstring(raw_mpd)
            ns = {"mpd": "urn:mpeg:DASH:schema:MPD:2011"}
            period = root.find("mpd:Period", ns)
            if period is not None:
                for b in period.findall("mpd:BaseURL", ns):
                    period.remove(b)
                base_elem = ET.Element("{urn:mpeg:DASH:schema:MPD:2011}BaseURL")
                base_elem.text = proxy_base
                period.insert(0, base_elem)
            rewritten_mpd = ET.tostring(root, encoding="utf-8", xml_declaration=True)
        except Exception:
            rewritten_mpd = raw_mpd.replace(
                "<Period", f"<Period><BaseURL>{proxy_base}</BaseURL>"
            ).encode("utf-8")

        response = HttpResponse(rewritten_mpd, content_type="application/dash+xml")
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Headers"] = "*"
        response["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        return response
    except Exception as error:
        logger.error(f"Error fetching direct CDN manifest for {source_url}: {error}")
        return HttpResponse("Error fetching direct CDN manifest", status=502)


def segment_proxy(request, encoded_cdn, segment_path):
    """
    Stateless proxy route. Decodes the CDN URL from base64 and streams
    chunks directly to the client without memory accumulation.
    """
    try:
        cdn_base = decode_b64(encoded_cdn)
    except Exception:
        return HttpResponse("Invalid CDN token", status=400)

    target_url = urllib.parse.urljoin(cdn_base, segment_path)

    req_headers = {"User-Agent": USER_AGENT, "Cookie": "tstc=p"}
    if "HTTP_RANGE" in request.META:
        req_headers["Range"] = request.META["HTTP_RANGE"]

    try:
        cdn_resp = session.get(target_url, headers=req_headers, stream=True, timeout=10)
    except Exception as e:
        logger.error(f"Failed to stream segment {segment_path}: {e}")
        return HttpResponse("Failed to stream segment", status=502)

    content_type = cdn_resp.headers.get("Content-Type", "video/mp4")
    if segment_path.endswith(".src") or "blob_" in segment_path:
        content_type = "text/vtt; charset=utf-8"

    def stream_generator():
        try:
            for chunk in cdn_resp.iter_content(chunk_size=64 * 1024):
                yield chunk
        finally:
            cdn_resp.close()

    response = StreamingHttpResponse(
        stream_generator(),
        status=cdn_resp.status_code,
        content_type=content_type
    )

    if "Content-Range" in cdn_resp.headers:
        response["Content-Range"] = cdn_resp.headers["Content-Range"]
    if "Content-Length" in cdn_resp.headers:
        response["Content-Length"] = cdn_resp.headers["Content-Length"]

    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Headers"] = "*"
    return response


def playlist_m3u(request):
    """Generates an M3U playlist file for Desktop VLC Media Player."""
    video_id = request.GET.get('id', '')
    if not video_id:
        return HttpResponse("Missing video id", status=400)

    manifest_url = request.build_absolute_uri(f"/react/istream/manifest/?id={video_id}")
    m3u_content = f"#EXTM3U\n#EXTINF:-1,iStreamFlare - {video_id}\n{manifest_url}\n"
    response = HttpResponse(m3u_content, content_type="audio/x-mpegurl")
    response["Content-Disposition"] = f'attachment; filename="istream_{video_id}.m3u"'
    response["Access-Control-Allow-Origin"] = "*"
    return response
