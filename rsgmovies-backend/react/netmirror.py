import base64
import json
import logging
import os
import random
import re
from pathlib import Path
from urllib.parse import quote, urljoin

import requests
from bs4 import BeautifulSoup
from django.conf import settings
from django.core.cache import cache
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.views.decorators.clickjacking import xframe_options_exempt, xframe_options_sameorigin
from django.views.decorators.csrf import csrf_exempt

from activity.services import log_activity_event
from react.models import NetmirrorSession

logger = logging.getLogger(__name__)

# Base target domain and proxies from environment
DEFAULT_PROXY = "http://shivaganesh:Shiva123@198.23.243.226:6361"
PROXY_URL = os.getenv("NETMIRROR_PROXY", os.getenv("PROXY_URL", DEFAULT_PROXY))
BASE_TARGET_DOMAIN = os.getenv("NETMIRROR_DOMAIN", os.getenv("DOMAIN", "https://net52.cc")).rstrip("/")

# HTTPS-safe stream proxy path matching moviebox (/stream-proxy) to prevent blocked:mixed-content
DEFAULT_STREAM_PROXY = "/stream-proxy/netmirror"
STREAM_PROXY_URL = os.getenv("STREAM_PROXY_URL", DEFAULT_STREAM_PROXY).rstrip("/")
if STREAM_PROXY_URL.startswith("http://129.225.115.187:5000"):
    STREAM_PROXY_URL = "/stream-proxy/netmirror"

PROXIES = {
    "http": PROXY_URL,
    "https": PROXY_URL,
}

HOME_URL = f"{BASE_TARGET_DOMAIN}/mobile/home"
VERIFY_URL = f"{BASE_TARGET_DOMAIN}/mobile/verify2.php"

# In-memory session store shared across all users
_NETMIRROR_SESSION = {
    "hash": "",
    "cookie": "",
}

SESSION_FILE_PATH = Path("/tmp/netmirror_session.json")


def load_session():
    """
    Loads session with multi-layer fallback:
    1. In-memory dictionary _NETMIRROR_SESSION (fastest)
    2. Django cache (shared across local threads)
    3. PostgreSQL NetmirrorSession DB table (permanent persistence across reboots & workers)
    4. /tmp/ local file fallback
    """
    global _NETMIRROR_SESSION
    if _NETMIRROR_SESSION.get("cookie"):
        return _NETMIRROR_SESSION

    # 1. Try Django Cache
    try:
        cached = cache.get("netmirror:session")
        if isinstance(cached, dict) and cached.get("cookie"):
            _NETMIRROR_SESSION.update(cached)
            return _NETMIRROR_SESSION
    except Exception:
        pass

    # 2. Try PostgreSQL Database
    try:
        obj = NetmirrorSession.objects.filter(user="admin").first()
        if obj and (obj.cookie_val or obj.hash_val):
            _NETMIRROR_SESSION["hash"] = obj.hash_val or ""
            _NETMIRROR_SESSION["cookie"] = obj.cookie_val or ""
            try:
                cache.set("netmirror:session", _NETMIRROR_SESSION, timeout=86400)
            except Exception:
                pass
            logger.info("Loaded NetMirror session from DB.")
            return _NETMIRROR_SESSION
    except Exception as e:
        logger.warning(f"Could not load netmirror session from DB: {e}")

    # 3. Fallback to local file
    if SESSION_FILE_PATH.exists():
        try:
            with open(SESSION_FILE_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    _NETMIRROR_SESSION.update(data)
        except Exception:
            pass

    return _NETMIRROR_SESSION


def save_session(hash_val=None, cookie_val=None):
    """
    Updates in-memory session and permanently persists to DB, Django cache, and local file.
    """
    global _NETMIRROR_SESSION
    if hash_val is not None:
        _NETMIRROR_SESSION["hash"] = hash_val
    if cookie_val is not None:
        _NETMIRROR_SESSION["cookie"] = cookie_val

    # Persist to Django Cache
    try:
        cache.set("netmirror:session", _NETMIRROR_SESSION, timeout=86400)
    except Exception:
        pass

    # Persist to PostgreSQL Database
    try:
        NetmirrorSession.objects.update_or_create(
            user="admin",
            defaults={
                "hash_val": _NETMIRROR_SESSION.get("hash", ""),
                "cookie_val": _NETMIRROR_SESSION.get("cookie", ""),
            },
        )
        
    except Exception as e:
        logger.warning(f"Could not persist NetMirror session to DB: {e}")

    # Persist to local file
    try:
        with open(SESSION_FILE_PATH, "w", encoding="utf-8") as f:
            json.dump(_NETMIRROR_SESSION, f)
    except Exception:
        pass

    return _NETMIRROR_SESSION


def clear_session():
    """Resets session store in DB, Django cache, memory, and local file."""
    global _NETMIRROR_SESSION
    _NETMIRROR_SESSION = {"hash": "", "cookie": ""}
    try:
        cache.delete("netmirror:session")
    except Exception:
        pass

    try:
        NetmirrorSession.objects.filter(user="admin").update(hash_val="", cookie_val="")
        logger.info("Cleared NetMirror session in DB.")
    except Exception as e:
        logger.warning(f"Could not clear NetMirror session in DB: {e}")

    try:
        if SESSION_FILE_PATH.exists():
            SESSION_FILE_PATH.unlink()
    except Exception:
        pass

    return _NETMIRROR_SESSION


def get_user_cookies(request=None):
    """
    Combines server authentication cookie (t_hash_t) with client-specific
    cookies (such as ott, hd, studio) sent by the user's browser.
    Defaults hd to 'on'.
    """
    session_data = load_session()
    cookies = {}

    cookie_val = session_data.get("cookie", "")
    if isinstance(cookie_val, dict):
        cookies.update(cookie_val)
    elif cookie_val and isinstance(cookie_val, str):
        cookies["t_hash_t"] = cookie_val

    # Default hd cookie to "on"
    cookies["hd"] = "on"

    if request:
        for k in ["ott", "hd", "studio"]:
            val = request.COOKIES.get(k)
            if val is not None and val != "":
                cookies[k] = val

    if cookies.get("hd") != "off":
        cookies["hd"] = "on"

    return cookies


def get_browser_headers():
    return {
        "User-Agent": (
            "Mozilla/5.0 (Linux; Android 13; GM1917 Build/TKQ1.221013.002; wv) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 "
            "Chrome/151.0.7922.199 Mobile Safari/537.36 /OS.Gatu v3.1"
        ),
        "Accept": (
            "text/html,application/xhtml+xml,application/xml;q=0.9,"
            "image/avif,image/webp,image/apng,*/*;q=0.8"
        ),
        "accept-language": "en-IN,en-US;q=0.9,en;q=0.8",
    }


def get_api_headers(referer=None):
    headers = get_browser_headers()
    headers.update({
        "Origin": BASE_TARGET_DOMAIN,
        "Referer": referer or f"{BASE_TARGET_DOMAIN}/mobile/home?app=1",
        "X-Requested-With": "app.netmirror.nmv2",
        "Accept": "*/*",
        "Accept-Encoding": "gzip, deflate, br, zstd",
    })
    return headers


def get_verify_headers():
    return {
        "User-Agent": (
            "Mozilla/5.0 (Linux; Android 13; GM1917 Build/TKQ1.221013.002; wv) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 "
            "Chrome/151.0.7922.199 Mobile Safari/537.36 /OS.Gatu v3.1"
        ),
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "sec-ch-ua-platform": '"Android"',
        "x-requested-with": "XMLHttpRequest",
        "sec-ch-ua": '"Not=A?Brand";v="99", "Android WebView";v="151", "Chromium";v="151"',
        "sec-ch-ua-mobile": "?1",
        "origin": BASE_TARGET_DOMAIN,
        "sec-fetch-site": "same-origin",
        "sec-fetch-mode": "cors",
        "sec-fetch-dest": "empty",
        "referer": f"{BASE_TARGET_DOMAIN}/mobile/home?app=1",
        "accept-language": "en-IN,en-US;q=0.9,en;q=0.8",
        "priority": "u=1, i",
    }


def add_domains_to_html(html_content, domain=BASE_TARGET_DOMAIN):
    """
    Condition 1.1: Adds target domain to static assets while keeping navigation
    and API requests relative to our backend.
    """
    soup = BeautifulSoup(html_content, "html.parser")

    base = soup.find("base")
    if base:
        base["href"] = "/"
    else:
        head = soup.find("head")
        if head:
            head.insert(0, soup.new_tag("base", href="/"))

    for tag in soup.find_all(["img", "script", "source", "video"]):
        for attr in ["src", "poster", "data-src", "data-original"]:
            val = tag.get(attr)
            if val and isinstance(val, str):
                if val.startswith("/") and not val.startswith("//"):
                    tag[attr] = f"{domain}{val}"
                elif val.startswith("./"):
                    tag[attr] = f"{domain}/{val[2:]}"

    for tag in soup.find_all("link"):
        val = tag.get("href")
        if val and isinstance(val, str):
            if val.startswith("/") and not val.startswith("//"):
                tag["href"] = f"{domain}{val}"
            elif val.startswith("./"):
                tag["href"] = f"{domain}/{val[2:]}"

    content = str(soup)
    content = re.sub(
        r'url\(([\'"]?)/([^\'"/][^\)\'"]*)\)',
        lambda m: f"url({m.group(1)}{domain}/{m.group(2)})",
        content,
    )
    return content


def calculate_and_click_adpage(html_data, referer_url=f"{BASE_TARGET_DOMAIN}/mobile/home?app=1"):
    """
    Calculates adpage URL and clicks it via residential proxy.
    Updates hash in session and returns the hash.
    """
    soup = BeautifulSoup(html_data, "html.parser")
    body_tag = soup.find("body")
    addhash2 = body_tag.get("data-addhash", "") if body_tag else ""

    if not addhash2:
        return None

    vsite2_match = re.search(r'var\s+Vsite2\s*=\s*["\']([^"\']+)["\']', html_data)
    qury_match = re.search(r'var\s+Qury\s*=\s*["\']([^"\']+)["\']', html_data)

    vsite2 = vsite2_match.group(1) if vsite2_match else "userver"
    qury = qury_match.group(1) if qury_match else "hee5"

    msite = f"https://{vsite2}.net52.cc/"
    rand_t = random.random()

    final_url = f"{msite}?{qury}={addhash2}&a=y&t={rand_t}"
    hash_val = f"{addhash2}&a=y&t={rand_t}"

    headers = get_browser_headers()
    headers["Referer"] = referer_url

    try:
        session = requests.Session()
        session.get(final_url, headers=headers, proxies=PROXIES, timeout=20)
    except Exception as e:
        logger.warning(f"Ad click request error: {e}")

    save_session(hash_val=hash_val, cookie_val="")
    return hash_val


def render_wait_page(message="Initializing session...", status="Connecting...", hash_val=""):
    """Renders a compact, clean, and professional wait view with animated progress and auto-refresh."""
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NetMirror</title>
    <style>
        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}
        html, body {{
            height: 100%;
            margin: 0;
            padding: 0;
        }}
        body {{
            background: #090d16;
            color: #e2e8f0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            min-height: 100vh;
            margin: 0;
            padding: 32px 16px 20px;
            box-sizing: border-box;
            overflow-y: auto;
            -webkit-font-smoothing: antialiased;
        }}
        .box {{
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            max-width: 360px;
            width: 100%;
            background: rgba(15, 23, 42, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-radius: 16px;
            padding: 24px 22px 20px;
            box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.6);
            animation: fadeIn 0.25s ease-out;
            margin-top: 10px;
        }}
        @keyframes fadeIn {{
            from {{ opacity: 0; transform: scale(0.97); }}
            to {{ opacity: 1; transform: scale(1); }}
        }}
        .spinner-wrapper {{
            position: relative;
            width: 32px;
            height: 32px;
            margin-bottom: 14px;
        }}
        .spinner {{
            width: 32px;
            height: 32px;
            border: 2.5px solid rgba(56, 189, 248, 0.15);
            border-top-color: #38bdf8;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }}
        @keyframes spin {{
            to {{ transform: rotate(360deg); }}
        }}
        .title {{
            font-size: 14px;
            font-weight: 600;
            color: #f8fafc;
            letter-spacing: -0.01em;
            margin-bottom: 4px;
        }}
        .subtitle {{
            font-size: 12px;
            color: #94a3b8;
            line-height: 1.4;
            margin-bottom: 12px;
        }}
        .status-pill {{
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(56, 189, 248, 0.08);
            border: 1px solid rgba(56, 189, 248, 0.18);
            color: #38bdf8;
            padding: 3px 9px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 500;
            margin-bottom: 16px;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }}
        .status-dot {{
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: #38bdf8;
            box-shadow: 0 0 6px #38bdf8;
            animation: pulse 1.8s ease-in-out infinite;
        }}
        @keyframes pulse {{
            0%, 100% {{ opacity: 1; transform: scale(1); }}
            50% {{ opacity: 0.35; transform: scale(0.85); }}
        }}
        .progress-bar-container {{
            width: 100%;
            height: 3px;
            background: rgba(255, 255, 255, 0.06);
            border-radius: 9999px;
            overflow: hidden;
            margin-bottom: 6px;
        }}
        .progress-bar {{
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, #38bdf8, #818cf8);
            border-radius: 9999px;
            transition: width 1s linear;
        }}
        .timer-text {{
            font-size: 11px;
            color: #64748b;
            margin-bottom: 14px;
        }}
        .timer-text b {{
            color: #cbd5e1;
            font-weight: 600;
        }}
        .actions {{
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
        }}
        .btn {{
            flex: 1;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 7px 12px;
            border-radius: 8px;
            font-size: 11.5px;
            font-weight: 500;
            text-decoration: none;
            transition: all 0.15s ease;
            cursor: pointer;
            border: none;
        }}
        .btn-primary {{
            background: #2563eb;
            color: #ffffff;
        }}
        .btn-primary:hover {{
            background: #1d4ed8;
        }}
        .btn-ghost {{
            background: rgba(255, 255, 255, 0.05);
            color: #94a3b8;
            border: 1px solid rgba(255, 255, 255, 0.08);
        }}
        .btn-ghost:hover {{
            background: rgba(255, 255, 255, 0.09);
            color: #e2e8f0;
        }}
    </style>
</head>
<body>
    <div class="box">
        <div class="spinner-wrapper">
            <div class="spinner"></div>
        </div>
        <div class="title">Initializing Session</div>
        <div class="subtitle">{message}</div>
        <div class="status-pill">
            <span class="status-dot"></span>
            <span>{status}</span>
        </div>
        <div class="progress-bar-container">
            <div class="progress-bar" id="progressBar"></div>
        </div>
        <div class="timer-text">Auto-verifying in <b id="timer">10</b>s</div>
        <div class="actions">
            <a href="/react/netmirror/verify" class="btn btn-primary">Refresh</a>
            <a href="/react/netmirror/new-session" class="btn btn-ghost">New Session</a>
        </div>
    </div>
    <script>
        let total = 10;
        let left = total;
        const timerEl = document.getElementById("timer");
        const progressEl = document.getElementById("progressBar");
        const interval = setInterval(() => {{
            left--;
            if (timerEl) timerEl.innerText = left;
            if (progressEl) {{
                const pct = Math.min(100, Math.round(((total - left) / total) * 100));
                progressEl.style.width = pct + "%";
            }}
            if (left <= 0) {{
                clearInterval(interval);
                window.location.href = "/react/netmirror/verify";
            }}
        }}, 1000);
    </script>
</body>
</html>"""
    return HttpResponse(html, content_type="text/html")


def run_condition_1(request, cookie_val, path_with_query="/mobile/home?app=1"):
    """Condition 1: Attempt page fetch with cookie."""
    cookies_dict = get_user_cookies(request)
    target_url = f"{BASE_TARGET_DOMAIN}{path_with_query}"

    try:
        session = requests.Session()
        response = session.get(
            target_url,
            headers=get_browser_headers(),
            cookies=cookies_dict,
            proxies=PROXIES,
            timeout=25,
        )

        soup = BeautifulSoup(response.text, "html.parser")
        body_tag = soup.find("body")
        has_addhash = bool(body_tag and body_tag.get("data-addhash"))

        # Valid page received
        if not has_addhash and ("data-homeurl" in response.text or '<div class="app"' in response.text):
            modified_html = add_domains_to_html(response.text)
            resp = HttpResponse(modified_html, content_type="text/html")
            if request and not request.COOKIES.get("hd"):
                resp.set_cookie("hd", "on", path="/", max_age=30 * 86400)
            return resp

        # Challenge received -> calculate & click ad
        hash_val = calculate_and_click_adpage(response.text, referer_url=response.url)
        return render_wait_page(
            "Generating session for NetMirror, please wait few seconds and click refresh/reload.",
            status="Ad clicked, waiting for session verification...",
            hash_val=hash_val or "",
        )
    except Exception as e:
        logger.error(f"Error in Condition 1: {e}")
        return render_wait_page(
            f"Network/Proxy error: {str(e)}",
            status="Error connecting to NetMirror",
            hash_val="",
        )


def run_condition_2(request):
    """Condition 2: Run without cookie, click ad, save hash, show wait page."""
    try:
        session = requests.Session()
        response = session.get(
            HOME_URL,
            params={"app": "1"},
            headers=get_browser_headers(),
            proxies=PROXIES,
            timeout=25,
        )

        hash_val = calculate_and_click_adpage(response.text, referer_url=response.url)
        return render_wait_page(
            "Generating session for NetMirror, please wait few seconds and click refresh/reload.",
            status="Ad clicked, waiting for session verification...",
            hash_val=hash_val or "",
        )
    except Exception as e:
        logger.error(f"Error in Condition 2: {e}")
        return render_wait_page(
            f"Network/Proxy error: {str(e)}",
            status="Error generating hash",
            hash_val="",
        )


def run_condition_1_3(request, hash_val):
    """Condition 1.3: Run verify2.php with stored hash."""
    if not hash_val:
        return run_condition_2(request)

    payload = {"verify": hash_val}
    cookies = {"addhash": hash_val}

    try:
        response = requests.post(
            VERIFY_URL,
            data=payload,
            headers=get_verify_headers(),
            cookies=cookies,
            proxies=PROXIES,
            timeout=20,
        )

        new_cookie = response.cookies.get("t_hash_t")
        if not new_cookie and response.cookies:
            for k, v in response.cookies.items():
                if "hash" in k.lower():
                    new_cookie = v
                    break

        status_msg = "Waiting for your ads click."
        try:
            res_json = response.json()
            status_msg = res_json.get("statusup", status_msg)
        except Exception:
            if "All Done" in response.text:
                status_msg = "All Done"

        # Cookie received -> save session and render page
        if new_cookie:
            save_session(cookie_val=new_cookie)
            return run_condition_1(request, new_cookie)

        return render_wait_page(
            "Generating session for NetMirror, please wait few seconds and click refresh/reload.",
            status=status_msg,
            hash_val=hash_val,
        )
    except Exception as e:
        logger.error(f"Error in Condition 1.3: {e}")
        return render_wait_page(
            f"Verification error: {str(e)}",
            status="Error verifying hash",
            hash_val=hash_val,
        )


def render_proxied_page(request, path_with_query="/mobile/home?app=1"):
    """Helper to check session and render proxied HTML page."""
    session_data = load_session()
    cookie = session_data.get("cookie", "")
    if cookie and str(cookie).strip():
        return run_condition_1(request, cookie, path_with_query=path_with_query)
    else:
        return run_condition_2(request)


# ---------------------------------------------------------
# View Handlers (Strictly Session Protected)
# ---------------------------------------------------------

@xframe_options_sameorigin
def netmirror_index(request):
    """Main NetMirror portal view."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized. Please sign in to RSG Movies."}, status=401)
    return render_proxied_page(request, "/mobile/home?app=1")


@xframe_options_sameorigin
def netmirror_verify(request):
    """Cond 1.3: Runs verify with stored session hash."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized. Please sign in to RSG Movies."}, status=401)
    session_data = load_session()
    hash_val = session_data.get("hash", "")
    return run_condition_1_3(request, hash_val)


@csrf_exempt
def netmirror_new_session(request):
    """Resets session for all users. Supports both JSON API and direct browser reload."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized. Please sign in to RSG Movies."}, status=401)

    clear_session()

    # If invoked via fetch/JSON API from React toolbar
    if (
        request.headers.get("accept") == "application/json"
        or request.GET.get("format") == "json"
        or request.method == "POST"
    ):
        # Trigger Condition 2 in background to generate fresh hash immediately
        try:
            session = requests.Session()
            response = session.get(HOME_URL, params={"app": "1"}, headers=get_browser_headers(), proxies=PROXIES, timeout=20)
            hash_val = calculate_and_click_adpage(response.text, referer_url=response.url)
            return JsonResponse({"success": True, "message": "Session reset successfully", "hash": hash_val or ""})
        except Exception as e:
            return JsonResponse({"success": True, "message": "Session reset", "error": str(e)})

    return run_condition_2(request)


def netmirror_status(request):
    """API endpoint to check current NetMirror session state."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    session_data = load_session()
    cookie = session_data.get("cookie", "")
    has_hash = bool(session_data.get("hash", ""))
    return JsonResponse({
        "active": bool(cookie and str(cookie).strip()),
        "has_hash": has_hash,
    })


@csrf_exempt
def netmirror_setting(request):
    """
    Proxies setting updates (e.g. ott=nf, hd=hd, studio=...).
    Supports standard and Disney/Hotstar endpoints.
    """
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    url = f"{BASE_TARGET_DOMAIN}{request.path}"
    headers = get_api_headers()
    cookies = get_user_cookies(request)

    try:
        if request.method == "POST":
            data = request.POST.dict() if request.POST else request.body
            resp = requests.post(
                url,
                data=data,
                params=request.GET,
                headers=headers,
                cookies=cookies,
                proxies=PROXIES,
                timeout=15,
            )
        else:
            resp = requests.get(
                url,
                params=request.GET,
                headers=headers,
                cookies=cookies,
                proxies=PROXIES,
                timeout=15,
            )

        django_resp = HttpResponse(
            resp.content,
            status=resp.status_code,
            content_type=resp.headers.get("Content-Type", "application/json"),
        )
        for k, v in resp.cookies.items():
            django_resp.set_cookie(k, v, path="/")

        # Explicitly forward posted parameters to client cookies
        form_data = request.POST if request.POST else {}
        if "ott" in form_data:
            ott_val = form_data.get("ott")
            django_resp.set_cookie("ott", ott_val, path="/")
            if ott_val not in ["dp", "hs"]:
                django_resp.delete_cookie("studio", path="/")
        if "studio" in form_data:
            django_resp.set_cookie("studio", form_data.get("studio"), path="/")
        if "hd" in form_data:
            try:
                hd_state = resp.json().get("hd", "on")
                django_resp.set_cookie("hd", hd_state, path="/", max_age=30 * 86400)
            except Exception:
                django_resp.set_cookie("hd", "on", path="/", max_age=30 * 86400)

        # Catch expired/deleted cookies like studio=deleted
        set_cookie_header = resp.headers.get("Set-Cookie", "")
        if "studio=deleted" in set_cookie_header:
            django_resp.delete_cookie("studio", path="/")

        return django_resp
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def netmirror_post(request):
    """Proxies movie/show metadata with caching and audit logging."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    post_id = request.GET.get("id", "")
    cache_key = f"netmirror:post:{post_id}" if post_id else None

    # Check cache first for GET requests
    if cache_key and request.method == "GET":
        cached_data = cache.get(cache_key)
        if cached_data:
            if getattr(request, "user", None) and request.user.is_authenticated and isinstance(cached_data, dict):
                log_activity_event(
                    event_type="MOVIE_VIEWED",
                    request=request,
                    user=request.user,
                    resource_type=cached_data.get("type", "Movie"),
                    resource_id="NetMirror",
                    metadata={"id": post_id, "title":cached_data.get("title", post_id)},
                )
            return JsonResponse(cached_data, safe=False)

    url = f"{BASE_TARGET_DOMAIN}{request.path}"
    headers = get_api_headers()
    cookies = get_user_cookies(request)

    try:
        if request.method == "POST":
            data_payload = request.POST.dict() if request.POST else request.body
            resp = requests.post(
                url,
                data=data_payload,
                params=request.GET,
                headers=headers,
                cookies=cookies,
                proxies=PROXIES,
                timeout=15,
            )
        else:
            resp = requests.get(
                url,
                params=request.GET,
                headers=headers,
                cookies=cookies,
                proxies=PROXIES,
                timeout=15,
            )

        try:
            data = resp.json()
            if isinstance(data, dict) and "suggest" in data and isinstance(data["suggest"], list):
                for item in data["suggest"]:
                    if isinstance(item, dict) and "id" in item:
                        item["img"] = f"https://imgcdn.kim/nf/v/200/{item['id']}.jpg"
                        item["poster"] = f"https://imgcdn.kim/nf/v/200/{item['id']}.jpg"

            # Cache enriched post metadata for 30 minutes
            if cache_key and isinstance(data, dict):
                cache.set(cache_key, data, timeout=1800)

            # Log audit activity
            if getattr(request, "user", None) and request.user.is_authenticated and isinstance(data, dict):
                log_activity_event(
                    event_type="MOVIE_VIEWED",
                    request=request,
                    user=request.user,
                    resource_type=data.get("type", "Movie"),
                    resource_id="NetMirror",
                    metadata={"id": post_id, "title": data.get("title", post_id)},
                )
            return JsonResponse(data, safe=False)
        except Exception:
            return HttpResponse(
                resp.content,
                status=resp.status_code,
                content_type=resp.headers.get("Content-Type", "application/json"),
            )
    except Exception as e:
        logger.error(f"Error fetching netmirror post: {e}")
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def netmirror_playlist(request):
    """
    Proxies stream playlist metadata with caching and audit logging.
    Rewrites stream URLs to HTTPS-safe /stream-proxy/netmirror path.
    """
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    post_id = request.GET.get("id", "")
    cache_key = f"netmirror:playlist:{post_id}" if post_id else None

    # Check cache first for GET requests
    if cache_key and request.method == "GET":
        cached_data = cache.get(cache_key)
        if cached_data:
            if getattr(request, "user", None) and request.user.is_authenticated:
                title_val = request.GET.get("t", post_id)
                log_activity_event(
                    event_type="MOVIE_STREAMING",
                    request=request,
                    user=request.user,
                    resource_type="Stream",
                    resource_id="NetMirror",
                    metadata={"id": post_id, "title": title_val},
                )
            django_resp = JsonResponse(cached_data, safe=False)
            django_resp.set_cookie("hd", "on", path="/", max_age=30 * 86400)
            return django_resp

    url = f"{BASE_TARGET_DOMAIN}{request.path}"
    headers = get_api_headers()
    cookies = get_user_cookies(request)
    cookies["hd"] = "on"

    try:
        if request.method == "POST":
            data_payload = request.POST.dict() if request.POST else request.body
            resp = requests.post(
                url,
                data=data_payload,
                params=request.GET,
                headers=headers,
                cookies=cookies,
                proxies=PROXIES,
                timeout=15,
            )
        else:
            resp = requests.get(
                url,
                params=request.GET,
                headers=headers,
                cookies=cookies,
                proxies=PROXIES,
                timeout=15,
            )

        try:
            data = resp.json()
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, dict) and "sources" in item:
                        sources_list = item.get("sources", [])
                        for s in sources_list:
                            file_val = s.get("file", "")
                            if file_val:
                                full_file_url = urljoin(BASE_TARGET_DOMAIN, file_val)
                                s["file"] = f"{STREAM_PROXY_URL}/stream.m3u8?url={quote(full_file_url, safe='')}"
                            if s.get("label") == "Auto":
                                s["default"] = "true"
                            else:
                                s.pop("default", None)

            if cache_key and isinstance(data, list):
                cache.set(cache_key, data, timeout=600)  # 10 min cache

            if getattr(request, "user", None) and request.user.is_authenticated:
                title_val = request.GET.get("t", post_id)
                log_activity_event(
                    event_type="MOVIE_STREAMING",
                    request=request,
                    user=request.user,
                    resource_type="Stream",
                    resource_id="NetMirror",
                    metadata={"id": post_id, "title": title_val},
                )

            django_resp = JsonResponse(data, safe=False)
            django_resp.set_cookie("hd", "on", path="/", max_age=30 * 86400)
            return django_resp
        except Exception:
            django_resp = HttpResponse(
                resp.content,
                status=resp.status_code,
                content_type=resp.headers.get("Content-Type", "application/json"),
            )
            django_resp.set_cookie("hd", "on", path="/", max_age=30 * 86400)
            return django_resp
    except Exception as e:
        logger.error(f"Error fetching netmirror playlist: {e}")
        return JsonResponse({"error": str(e)}, status=500)


def netmirror_hls(request, subpath):
    """Redirects HLS requests to dedicated stream proxy."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    full_url = f"{BASE_TARGET_DOMAIN}{request.path}"
    qs = request.META.get("QUERY_STRING", "")
    if qs:
        full_url += f"?{qs}"
    return HttpResponseRedirect(f"{STREAM_PROXY_URL}/stream.m3u8?url={quote(full_url, safe='')}")


def netmirror_subtitle(request):
    """Proxies and formats WebVTT subtitles."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized"}, status=401)
    sub_url = request.GET.get("url")
    if not sub_url:
        return HttpResponse("Missing url parameter", status=400)

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Linux; Android 13; GM1917 Build/TKQ1.221013.002; wv) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 "
            "Chrome/151.0.7922.199 Mobile Safari/537.36 /OS.Gatu v3.1"
        ),
        "Referer": f"{BASE_TARGET_DOMAIN}/",
    }

    try:
        resp = requests.get(sub_url, headers=headers, proxies=PROXIES, timeout=15)
        vtt_text = "WEBVTT\n\n" + re.sub(r"(\d{2}:\d{2}:\d{2}),(\d{3})", r"\1.\2", resp.text)
        response = HttpResponse(vtt_text, content_type="text/vtt")
        response["Access-Control-Allow-Origin"] = "*"
        return response
    except Exception as e:
        return HttpResponse(f"Subtitle error: {str(e)}", status=500)


def netmirror_api_init(request):
    """Initializes player playlist data."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    movie_id = request.GET.get("id", "tt33318732")
    title = request.GET.get("t", "Jailer 2")
    tm = request.GET.get("tm", "")

    url = f"{BASE_TARGET_DOMAIN}/mobile/playlist.php"
    params = {"id": movie_id, "t": title}
    if tm:
        params["tm"] = tm

    headers = get_api_headers()
    cookies = get_user_cookies(request)
    cookies["hd"] = "on"

    try:
        resp = requests.get(url, params=params, headers=headers, cookies=cookies, proxies=PROXIES, timeout=15)
        data = resp.json()
        if isinstance(data, list) and len(data) > 0:
            first_item = data[0]
            sources = first_item.get("sources", [])
            master_file = sources[0]["file"] if sources else ""
            master_url = urljoin(BASE_TARGET_DOMAIN, master_file)

            subtitles = []
            for track in first_item.get("tracks", []):
                if track.get("kind") == "captions":
                    raw_sub = track.get("file", "")
                    if raw_sub.startswith("//"):
                        raw_sub = "https:" + raw_sub
                    subtitles.append({
                        "label": track.get("label", "English"),
                        "src": f"/react/netmirror/subtitle?url={quote(raw_sub, safe='')}",
                    })

            dedicated_stream_url = f"{STREAM_PROXY_URL}/stream.m3u8?url={quote(master_url, safe='')}"

            return JsonResponse({
                "stream_url": dedicated_stream_url,
                "dedicated_proxy": True,
                "sources": sources,
                "subtitles": subtitles,
                "image": first_item.get("image2", ""),
            })
        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@xframe_options_sameorigin
def netmirror_general_mobile(request, subpath):
    """Fallback proxy for any other /mobile/* requests."""
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    clean_subpath = subpath.split("?")[0]
    if clean_subpath in ["home", "series", "movies", ""]:
        qs = request.META.get("QUERY_STRING", "")
        path_with_query = f"/mobile/{clean_subpath}" + (f"?{qs}" if qs else "?app=1")
        return render_proxied_page(request, path_with_query)

    url = f"{BASE_TARGET_DOMAIN}/mobile/{subpath}"
    headers = get_api_headers()
    cookies = get_user_cookies(request)
    cookies["hd"] = "on"

    try:
        if request.method == "POST":
            data = request.POST.dict() if request.POST else request.body
            resp = requests.post(
                url,
                data=data,
                params=request.GET,
                headers=headers,
                cookies=cookies,
                proxies=PROXIES,
                timeout=20,
            )
        else:
            resp = requests.get(
                url,
                params=request.GET,
                headers=headers,
                cookies=cookies,
                proxies=PROXIES,
                timeout=20,
            )

        django_resp = HttpResponse(
            resp.content,
            status=resp.status_code,
            content_type=resp.headers.get("Content-Type", "application/octet-stream"),
        )
        for k, v in resp.cookies.items():
            django_resp.set_cookie(k, v, path="/")
        return django_resp
    except Exception as e:
        return HttpResponse(str(e), status=500)
