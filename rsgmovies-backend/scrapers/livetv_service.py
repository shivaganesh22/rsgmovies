import logging
import re
import urllib.request
from typing import Dict, List, Any
from django.core.cache import cache

logger = logging.getLogger(__name__)

IPTV_M3U_URL = "https://iptv-org.github.io/iptv/countries/in.m3u"
CACHE_KEY = "iptv_indian_channels_v1"
CACHE_TTL = 60 * 60 * 6  # 6 hours

# Normalized category mappings
PRIMARY_CATEGORIES = [
    "All",
    "Entertainment",
    "Movies",
    "News",
    "Music",
    "Sports",
    "Kids",
    "Religious",
    "Education",
    "Documentary",
    "General",
]


def clean_category_name(raw_group: str) -> str:
    if not raw_group or raw_group.strip() in ("", "Undefined", "undefined"):
        return "General"
    
    first_group = raw_group.split(';')[0].strip()
    first_group_lower = first_group.lower()

    if "movie" in first_group_lower:
        return "Movies"
    if "news" in first_group_lower or "legislative" in first_group_lower or "business" in first_group_lower:
        return "News"
    if "music" in first_group_lower:
        return "Music"
    if "sport" in first_group_lower:
        return "Sports"
    if "kid" in first_group_lower or "animation" in first_group_lower:
        return "Kids"
    if "religio" in first_group_lower:
        return "Religious"
    if "educat" in first_group_lower or "science" in first_group_lower:
        return "Education"
    if "docu" in first_group_lower or "history" in first_group_lower:
        return "Documentary"
    if "entertain" in first_group_lower or "comedy" in first_group_lower or "culture" in first_group_lower:
        return "Entertainment"
    if "lifestyle" in first_group_lower or "cooking" in first_group_lower or "travel" in first_group_lower:
        return "Entertainment"
        
    return first_group.capitalize() if first_group else "General"


def extract_resolution(name: str) -> tuple[str, str]:
    """
    Extracts resolution like (1080p), (720p), (576p) from channel name and returns (clean_name, resolution).
    """
    res_match = re.search(r'\((1080p|720p|576p|480p|360p|240p|4K|HD|SD)\)', name, re.IGNORECASE)
    if res_match:
        res = res_match.group(1).upper()
        clean_name = re.sub(r'\s*\((1080p|720p|576p|480p|360p|240p|4K|HD|SD)\)', '', name, flags=re.IGNORECASE).strip()
        return clean_name, res
    return name.strip(), "HD"


def fetch_and_parse_m3u(url: str = IPTV_M3U_URL) -> List[Dict[str, Any]]:
    """
    Fetches M3U playlist from iptv-org and parses into structured channel objects.
    """
    try:
        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
            }
        )
        with urllib.request.urlopen(req, timeout=12) as response:
            content = response.read().decode('utf-8', errors='ignore')
    except Exception as e:
        logger.error(f"Failed to fetch M3U playlist from {url}: {e}")
        return []

    lines = content.splitlines()
    channels = []
    current: Dict[str, Any] = {}
    channel_idx = 0

    for line in lines:
        line = line.strip()
        if not line:
            continue

        if line.startswith('#EXTINF:'):
            current = {}
            channel_idx += 1

            tvg_id_m = re.search(r'tvg-id="([^"]*)"', line)
            tvg_logo_m = re.search(r'tvg-logo="([^"]*)"', line)
            group_title_m = re.search(r'group-title="([^"]*)"', line)
            raw_name = line.split(',')[-1].strip() if ',' in line else f'Channel {channel_idx}'

            clean_name, quality = extract_resolution(raw_name)
            raw_group = group_title_m.group(1) if group_title_m else 'General'
            category = clean_category_name(raw_group)

            current['id'] = tvg_id_m.group(1) if (tvg_id_m and tvg_id_m.group(1)) else f"in-channel-{channel_idx}"
            current['name'] = clean_name
            current['raw_name'] = raw_name
            current['quality'] = quality
            current['logo'] = tvg_logo_m.group(1) if tvg_logo_m else ''
            current['category'] = category
            current['group'] = category
            current['country'] = 'India'
            current['country_code'] = 'IN'

        elif (line.startswith('http://') or line.startswith('https://')) and current:
            current['url'] = line
            channels.append(current)
            current = {}

    return channels


def get_live_tv_channels(force_refresh: bool = False) -> Dict[str, Any]:
    """
    Returns cached or freshly parsed Live TV channels and category stats.
    """
    if not force_refresh:
        cached_data = cache.get(CACHE_KEY)
        if cached_data:
            return cached_data

    channels = fetch_and_parse_m3u(IPTV_M3U_URL)
    
    # If fetch failed and we have no cached data, return empty graceful structure
    if not channels:
        return {
            "total": 0,
            "categories": PRIMARY_CATEGORIES,
            "channels": []
        }

    # Collect available categories dynamically while preserving primary order
    categories_set = {c['category'] for c in channels}
    categories = [cat for cat in PRIMARY_CATEGORIES if cat == "All" or cat in categories_set]
    # Add any extra categories found
    for cat in sorted(categories_set):
        if cat not in categories:
            categories.append(cat)

    result = {
        "total": len(channels),
        "categories": categories,
        "channels": channels
    }

    # Cache the result for 6 hours
    cache.set(CACHE_KEY, result, CACHE_TTL)
    return result
