import os
import sys
import re
import urllib.parse
from urllib.parse import urljoin, urlparse, quote
import subprocess
import logging
import requests
try:
    from curl_cffi import requests as curl_requests
except ImportError:
    curl_requests = None
from django.http import StreamingHttpResponse, HttpResponse
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

try:
    import yt_dlp
except ImportError:
    yt_dlp = None

logger = logging.getLogger(__name__)

MEDIA_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.8',
}


def format_duration(seconds):
    if not seconds:
        return "0:00"
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


def format_file_size(bytes_val):
    if not bytes_val:
        return "Variable"
    if bytes_val > 1024 * 1024 * 1024:
        return f"{bytes_val / (1024**3):.1f} GB"
    return f"{bytes_val / (1024**2):.1f} MB"


def _clean_download_filename(filename):
    return re.sub(r'[^\w\s.-]', '', filename or '').strip() or 'download.mp4'


@api_view(["GET"])
@permission_classes([AllowAny])
def media_proxy(request):
    """Proxy remote media so HLS and direct files work without browser CORS errors."""
    target_url = request.GET.get('url', '').strip()
    if not target_url or urlparse(target_url).scheme not in ('http', 'https'):
        return HttpResponse("Missing or invalid media URL", status=400)

    parsed_url = urlparse(target_url)
    headers = MEDIA_HEADERS.copy()
    headers['Referer'] = f'{parsed_url.scheme}://{parsed_url.netloc}/'
    if request.headers.get('Range'):
        headers['Range'] = request.headers['Range']

    try:
        request_client = curl_requests if curl_requests is not None else requests
        request_kwargs = {'impersonate': 'chrome'} if curl_requests is not None else {}
        upstream = request_client.get(
            target_url,
            headers=headers,
            stream=True,
            timeout=30,
            **request_kwargs,
        )
        if upstream.status_code not in (200, 206):
            return HttpResponse(f'Upstream media error: HTTP {upstream.status_code}', status=502)

        content_type = upstream.headers.get('Content-Type', 'application/octet-stream')
        is_playlist = '.m3u8' in target_url.lower() or 'mpegurl' in content_type.lower()
        is_download = request.GET.get('download', '').lower() in ('1', 'true', 'yes')

        if is_playlist:
            def proxy_playlist_url(value):
                if value.startswith(('data:', 'blob:')):
                    return value
                child_url = urljoin(target_url, value)
                return f'/api/media/proxy/?url={quote(child_url, safe="")}'

            rewritten = []
            for line in upstream.text.splitlines():
                stripped = line.strip()
                if stripped and not stripped.startswith('#'):
                    rewritten.append(proxy_playlist_url(stripped))
                elif 'URI="' in line:
                    line = re.sub(r'URI="([^"]+)"', lambda match: f'URI="{proxy_playlist_url(match.group(1))}"', line)
                    rewritten.append(line)
                else:
                    rewritten.append(line)
            response = HttpResponse('\n'.join(rewritten), content_type='application/vnd.apple.mpegurl')
        else:
            response = StreamingHttpResponse(
                upstream.iter_content(chunk_size=64 * 1024),
                status=upstream.status_code,
                content_type=content_type,
            )
            for header in ('Content-Length', 'Content-Range', 'Accept-Ranges'):
                if upstream.headers.get(header):
                    response[header] = upstream.headers[header]

        response['Access-Control-Allow-Origin'] = '*'
        if is_download:
            filename = _clean_download_filename(request.GET.get('filename'))
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
    except requests.RequestException as exc:
        logger.error('Media proxy error for %s: %s', target_url, exc)
        return HttpResponse('Media proxy request failed', status=502)
    except Exception:
        logger.exception('Unexpected media proxy error for %s', target_url)
        return HttpResponse('Media proxy request failed', status=502)


@api_view(["GET"])
@permission_classes([AllowAny])
def youtube_info(request):
    """
    Extracts direct video/audio stream URLs (4K, 1080p, 720p, 480p, 360p, MP3/M4A),
    playlist entries, and metadata using yt-dlp with zero server storage.
    """
    if yt_dlp is None:
        return Response({"error": "yt-dlp is not installed on this server"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    url = request.GET.get("url", "").strip()
    if not url:
        return Response({"error": "Video or Playlist URL is required"}, status=status.HTTP_400_BAD_REQUEST)

    # Standardize short/mobile URLs
    if "youtu.be/" in url:
        video_id = url.split("youtu.be/")[-1].split("?")[0].split("&")[0]
        url = f"https://www.youtube.com/watch?v={video_id}"
    elif "youtube.com/shorts/" in url:
        video_id = url.split("youtube.com/shorts/")[-1].split("?")[0].split("&")[0]
        url = f"https://www.youtube.com/watch?v={video_id}"

    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
        'extract_flat': 'in_playlist',
        'socket_timeout': 10,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not info:
                return Response({"error": "Could not extract video metadata from this URL"}, status=status.HTTP_404_NOT_FOUND)

            # 1. Handle Playlists
            if info.get('_type') == 'playlist' or ('entries' in info and not info.get('formats')):
                entries = []
                for e in info.get('entries', []):
                    if not e:
                        continue
                    v_id = e.get('id', '')
                    dur = e.get('duration')
                    entries.append({
                        'id': v_id,
                        'title': e.get('title', 'Video'),
                        'duration': dur,
                        'duration_str': format_duration(dur),
                        'thumbnail': e.get('thumbnail') or f"https://i.ytimg.com/vi/{v_id}/hqdefault.jpg",
                        'url': f"https://www.youtube.com/watch?v={v_id}" if v_id else e.get('url', ''),
                        'uploader': e.get('uploader', info.get('uploader', '')),
                    })
                return Response({
                    'is_playlist': True,
                    'id': info.get('id', ''),
                    'title': info.get('title', 'YouTube Playlist'),
                    'uploader': info.get('uploader', ''),
                    'uploader_url': info.get('uploader_url', ''),
                    'thumbnail': info.get('thumbnail') or (entries[0]['thumbnail'] if entries else ''),
                    'total_items': len(entries),
                    'entries': entries,
                }, status=status.HTTP_200_OK)

            # 2. Handle Single Video / Audio
            raw_formats = info.get('formats', [])
            video_formats = []
            audio_formats = []

            seen_video_res = set()
            seen_audio_abr = set()

            for f in raw_formats:
                f_url = f.get('url', '')
                if not f_url or 'manifest' in f_url or f.get('protocol') in ['m3u8', 'm3u8_native']:
                    continue

                vcodec = f.get('vcodec', 'none')
                acodec = f.get('acodec', 'none')
                height = f.get('height')
                ext = (f.get('ext') or 'mp4').lower()
                filesize = f.get('filesize') or f.get('filesize_approx')
                size_str = format_file_size(filesize)
                has_audio = (acodec != 'none')

                # Video streams (4K, 2K, 1080p, 720p, 480p, 360p, 240p)
                if vcodec != 'none' and height and height >= 144:
                    if height >= 2160:
                        res_label = "4K (2160p)"
                    elif height >= 1440:
                        res_label = "2K (1440p)"
                    elif height >= 1080:
                        res_label = "1080p Full HD"
                    elif height >= 720:
                        res_label = "720p HD"
                    elif height >= 480:
                        res_label = "480p"
                    elif height >= 360:
                        res_label = "360p"
                    else:
                        res_label = f"{height}p"

                    key = f"{height}_{ext}_{has_audio}"
                    if key not in seen_video_res:
                        seen_video_res.add(key)
                        video_formats.append({
                            'quality': res_label,
                            'resolution': f"{height}p",
                            'height': height,
                            'ext': ext.upper(),
                            'size': size_str,
                            'size_bytes': filesize,
                            'has_audio': has_audio,
                            'fps': f.get('fps'),
                            'url': f_url,
                            'format_id': f.get('format_id'),
                            'note': 'Full Video + Sound' if has_audio else 'Video Track (High Definition)',
                        })

                # Audio streams
                elif vcodec == 'none' and acodec != 'none':
                    abr = f.get('abr')
                    abr_num = int(abr) if abr else 128
                    abr_label = f"{abr_num} kbps"
                    key = f"{abr_num}_{ext}"
                    if key not in seen_audio_abr:
                        seen_audio_abr.add(key)
                        audio_formats.append({
                            'quality': abr_label,
                            'abr': abr_num,
                            'ext': ext.upper(),
                            'size': size_str,
                            'size_bytes': filesize,
                            'url': f_url,
                            'format_id': f.get('format_id'),
                            'note': f'{ext.upper()} Audio Track',
                        })

            # Sort video by height descending (4K -> 1080p -> 720p -> 480p -> 360p), prioritizing formats with audio and MP4
            video_formats.sort(key=lambda x: (x['height'], 1 if x['has_audio'] else 0, 1 if x['ext'] == 'MP4' else 0), reverse=True)
            audio_formats.sort(key=lambda x: x['abr'], reverse=True)

            video_id = info.get('id', '')
            embed_url = f"https://www.youtube.com/embed/{video_id}" if video_id else ""

            return Response({
                'is_playlist': False,
                'id': video_id,
                'title': info.get('title', 'Video'),
                'description': (info.get('description') or '')[:400],
                'uploader': info.get('uploader', ''),
                'uploader_url': info.get('uploader_url', ''),
                'thumbnail': info.get('thumbnail') or f"https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg",
                'duration': info.get('duration'),
                'duration_str': format_duration(info.get('duration')),
                'view_count': info.get('view_count'),
                'like_count': info.get('like_count'),
                'upload_date': info.get('upload_date'),
                'embed_url': embed_url,
                'video_formats': video_formats,
                'audio_formats': audio_formats,
            }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"yt-dlp extraction error for {url}: {e}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([AllowAny])
def youtube_stream(request):
    """
    Direct streaming proxy that pipes video/audio chunks from yt-dlp to the client browser.
    Delivers full 4K, 1080p, 720p, 480p, 360p, or audio with 0 disk write.
    """
    video_id = request.GET.get("id", "").strip()
    format_id = request.GET.get("format_id", "").strip()
    filename = request.GET.get("filename", "video.mp4").strip()
    raw_url = request.GET.get("url", "").strip()

    clean_filename = re.sub(r'[^\w\s.-]', '', filename).strip() or "video.mp4"
    
    # Sanitize and validate video ID / URL
    if video_id:
        clean_vid = re.sub(r'[^a-zA-Z0-9_-]', '', video_id)
        yt_url = f"https://www.youtube.com/watch?v={clean_vid}"
    elif raw_url:
        parsed = urlparse(raw_url)
        if parsed.netloc in ['www.youtube.com', 'youtube.com', 'm.youtube.com', 'youtu.be']:
            yt_url = raw_url
        else:
            return HttpResponse("Invalid YouTube URL domain", status=400)
    else:
        return HttpResponse("Missing video id or url parameter", status=400)

    # Sanitize format selector
    selected_format = re.sub(r'[^a-zA-Z0-9_+/-]', '', format_id) if format_id else 'best'

    def stream_process():
        py_bin = sys.executable or "python"
        cmd = [py_bin, '-m', 'yt_dlp', '--no-warnings', '-f', selected_format, '-o', '-', yt_url]
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        try:
            while True:
                chunk = proc.stdout.read(65536)
                if not chunk:
                    break
                yield chunk
        finally:
            if proc.poll() is None:
                proc.kill()

    ext = clean_filename.split('.')[-1].lower()
    content_type = "video/mp4"
    if ext in ['m4a', 'mp3', 'opus', 'aac']:
        content_type = f"audio/{ext}"
    elif ext == 'webm':
        content_type = "video/webm"

    response = StreamingHttpResponse(stream_process(), content_type=content_type)
    response['Content-Disposition'] = f'attachment; filename="{urllib.parse.quote(clean_filename)}"'
    return response


# Legacy endpoints maintained for backward compatibility
@api_view(["GET"])
@permission_classes([AllowAny])
def youtube(r):
    return youtube_info(r)


@api_view(["GET"])
@permission_classes([AllowAny])
def youtube_progress(r):
    return Response({"success": 1, "progress": 100}, status=status.HTTP_200_OK)
