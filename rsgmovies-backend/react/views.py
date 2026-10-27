import os
import json
import re
import base64
import logging
import traceback
from urllib.parse import urlparse, quote, parse_qs
import requests
try:
    from curl_cffi import requests as curl_requests
except ImportError:
    curl_requests = None
from bs4 import BeautifulSoup as bs
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from accounts.permissions import IsAuthenticated, IsAdminRole, IsUserRole
from seedr_service.services import get_seedr_service_for_user
from seedr_service.exceptions import SeedrError
from react.models import LockFolder, Contact
from react.serializers import ContactSerializer
from activity.services import log_activity_event

logger = logging.getLogger(__name__)

# Request headers for web scraping
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:106.0) Gecko/20100101 Firefox/106.0',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
}

MOVIERULZ_DOMAIN = os.getenv("MOVIERULZ_DOMAIN", "https://www.5movierulz.army/")
TAMILMV_DOMAIN = os.getenv("TAMILMV_DOMAIN", "https://www.1tamilmv.com/")
IBOMMA_DOMAIN = os.getenv("IBOMMA_DOMAIN", "https://rto.bappam.eu/telugu-movies/")
TORRENT_SEARCH_DOMAIN = os.getenv("TORRENT_SEARCH_DOMAIN", "https://www.torrentdownloads.pro/")


# ============================================================================
# Seedr File Management API Views (Session Authenticated)
# ============================================================================

class FilesApi(APIView):
    """
    Lists files and folders for the authenticated user's assigned Seedr account.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            service = get_seedr_service_for_user(request.user)
            data = service.list_contents()
            return Response(data, status=status.HTTP_200_OK)
        except SeedrError as e:
            return Response({"error": {"code": e.code, "message": e.message}}, status=status.HTTP_502_BAD_GATEWAY)
        except Exception as e:
            logger.error(f"Error fetching files: {e}")
            return Response({"error": {"code": "SEEDR_ERROR", "message": "Failed to fetch files"}}, status=status.HTTP_502_BAD_GATEWAY)


class OpenFolder(APIView):
    """
    Lists the contents of a specific folder in the user's Seedr account.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        try:
            service = get_seedr_service_for_user(request.user)
            data = service.list_contents(folder_id=id)
            return Response(data, status=status.HTTP_200_OK)
        except SeedrError as e:
            return Response({"error": {"code": e.code, "message": e.message}}, status=status.HTTP_502_BAD_GATEWAY)
        except Exception as e:
            logger.error(f"Error opening folder {id}: {e}")
            return Response({"error": {"code": "SEEDR_ERROR", "message": "Failed to open folder"}}, status=status.HTTP_502_BAD_GATEWAY)


class FolderFile(APIView):
    """
    Fetches the first file inside a specific folder.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        try:
            service = get_seedr_service_for_user(request.user)
            data = service.list_contents(folder_id=id)
            files = data.get('files', [])
            if not files:
                return Response({"error": {"code": "NOT_FOUND", "message": "No files found in this folder"}}, status=status.HTTP_404_NOT_FOUND)
            first_file_id = files[0].get('folder_file_id') or files[0].get('id')
            file_data = service.fetch_file(first_file_id)
            return Response(file_data, status=status.HTTP_200_OK)
        except SeedrError as e:
            return Response({"error": {"code": e.code, "message": e.message}}, status=status.HTTP_502_BAD_GATEWAY)
        except Exception as e:
            logger.error(f"Error fetching folder file: {e}")
            return Response({"error": {"code": "SEEDR_ERROR", "message": "Failed to fetch folder file"}}, status=status.HTTP_502_BAD_GATEWAY)


class FolderFilePlayer(APIView):
    """
    Fetches streaming details (and m3u8 if available) for the first file in a folder.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        try:
            service = get_seedr_service_for_user(request.user)
            data = service.list_contents(folder_id=id)
            files = data.get('files', [])
            if not files:
                return Response({"error": {"code": "NOT_FOUND", "message": "No files found in folder"}}, status=status.HTTP_404_NOT_FOUND)
            first_file_id = files[0].get('folder_file_id') or files[0].get('id')
            stream_data = service.get_stream_url(first_file_id)
            file_name = files[0].get('name') or files[0].get('title') or (stream_data.get('name') if isinstance(stream_data, dict) else '') or ''
            log_activity_event(
                event_type='STREAM_STARTED',
                request=request,
                user=request.user,
                resource_type='FolderFile',
                resource_id=str(first_file_id),
                metadata={'folder_id': str(id), 'file_name': file_name, 'title': file_name, 'name': file_name}
            )
            return Response(stream_data, status=status.HTTP_200_OK)
        except SeedrError as e:
            return Response({"error": {"code": e.code, "message": e.message}}, status=status.HTTP_502_BAD_GATEWAY)
        except Exception as e:
            logger.error(f"Error fetching folder player for {id}: {e}")
            return Response({"error": {"code": "SEEDR_ERROR", "message": "Failed to fetch player"}}, status=status.HTTP_502_BAD_GATEWAY)


class GetFile(APIView):
    """
    Fetches metadata and direct link for a specific Seedr file.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        try:
            service = get_seedr_service_for_user(request.user)
            file_data = service.fetch_file(id)
            return Response(file_data, status=status.HTTP_200_OK)
        except SeedrError as e:
            return Response({"error": {"code": e.code, "message": e.message}}, status=status.HTTP_502_BAD_GATEWAY)
        except Exception as e:
            logger.error(f"Error fetching file {id}: {e}")
            return Response({"error": {"code": "SEEDR_ERROR", "message": "Failed to fetch file"}}, status=status.HTTP_502_BAD_GATEWAY)


class GetFilePlayer(APIView):
    """
    Fetches stream URL / m3u8 for a specific file.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        try:
            service = get_seedr_service_for_user(request.user)
            stream_data = service.get_stream_url(id)
            file_name = (stream_data.get('name') or stream_data.get('title')) if isinstance(stream_data, dict) else ''
            log_activity_event(
                event_type='STREAM_STARTED',
                request=request,
                user=request.user,
                resource_type='SeedrFile',
                resource_id=str(id),
                metadata={'file_id': str(id), 'title': file_name, 'name': file_name}
            )
            return Response(stream_data, status=status.HTTP_200_OK)
        except SeedrError as e:
            return Response({"error": {"code": e.code, "message": e.message}}, status=status.HTTP_502_BAD_GATEWAY)
        except Exception as e:
            logger.error(f"Error fetching file player {id}: {e}")
            return Response({"error": {"code": "SEEDR_ERROR", "message": "Failed to fetch player"}}, status=status.HTTP_502_BAD_GATEWAY)


class AddTorrent(APIView):
    """
    Adds a magnet or torrent link to the user's Seedr account.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        link = request.query_params.get('link') or request.data.get('link')
        if not link:
            return Response({"error": {"code": "VALIDATION_ERROR", "message": "Query parameter 'link' is required"}}, status=status.HTTP_400_BAD_REQUEST)
        try:
            service = get_seedr_service_for_user(request.user)
            res = service.add_torrent(link)
            torrent_title = (res.get('title') if isinstance(res, dict) else None) or request.query_params.get('title') or request.data.get('title') or ''
            log_activity_event(
                event_type='SEEDR_OP_SUCCESS',
                request=request,
                user=request.user,
                resource_type='Torrent',
                resource_id=str(link)[:100],
                metadata={'action': 'add_torrent', 'link': str(link)[:100], 'title': torrent_title}
            )
            return Response(res, status=status.HTTP_200_OK)
        except SeedrError as e:
            return Response({"error": {"code": e.code, "message": e.message}}, status=status.HTTP_502_BAD_GATEWAY)
        except Exception as e:
            logger.error(f"Error adding torrent: {e}")
            return Response({"error": {"code": "SEEDR_ERROR", "message": "Failed to add torrent"}}, status=status.HTTP_502_BAD_GATEWAY)

    def post(self, request):
        return self.get(request)


class DeleteTorrent(APIView):
    """
    Deletes a torrent task by ID.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        try:
            service = get_seedr_service_for_user(request.user)
            res = service.delete_torrent(id)
            torrent_title = request.query_params.get('name') or request.query_params.get('title') or request.data.get('title') or ''
            log_activity_event(
                event_type='SEEDR_OP_SUCCESS',
                request=request,
                user=request.user,
                resource_type='Torrent',
                resource_id=str(id),
                metadata={'action': 'delete_torrent', 'id': str(id), 'title': torrent_title}
            )
            return Response(res, status=status.HTTP_200_OK)
        except SeedrError as e:
            return Response({"error": {"code": e.code, "message": e.message}}, status=status.HTTP_502_BAD_GATEWAY)

    def delete(self, request, id):
        return self.get(request, id)


class DeleteFolder(APIView):
    """
    Deletes a folder by ID.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        if LockFolder.objects.filter(folder_id=str(id)).exists():
            return Response({"error": {"code": "FOLDER_LOCKED", "message": "This folder is locked by admin"}}, status=status.HTTP_403_FORBIDDEN)
        try:
            service = get_seedr_service_for_user(request.user)
            res = service.delete_folder(id)
            folder_name = request.query_params.get('name') or request.query_params.get('title') or request.data.get('title') or ''
            log_activity_event(
                event_type='SEEDR_OP_SUCCESS',
                request=request,
                user=request.user,
                resource_type='Folder',
                resource_id=str(id),
                metadata={'action': 'delete_folder', 'id': str(id), 'title': folder_name, 'name': folder_name}
            )
            return Response(res, status=status.HTTP_200_OK)
        except SeedrError as e:
            return Response({"error": {"code": e.code, "message": e.message}}, status=status.HTTP_502_BAD_GATEWAY)

    def delete(self, request, id):
        return self.get(request, id)


class DeleteFile(APIView):
    """
    Deletes a file by ID.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, id, fid=None):
        if fid and LockFolder.objects.filter(folder_id=str(fid)).exists():
            return Response({"error": {"code": "FOLDER_LOCKED", "message": "Parent folder is locked by admin"}}, status=status.HTTP_403_FORBIDDEN)
        try:
            service = get_seedr_service_for_user(request.user)
            res = service.delete_file(id)
            file_name = request.query_params.get('name') or request.query_params.get('title') or request.data.get('title') or ''
            log_activity_event(
                event_type='SEEDR_OP_SUCCESS',
                request=request,
                user=request.user,
                resource_type='File',
                resource_id=str(id),
                metadata={'action': 'delete_file', 'id': str(id), 'parent_folder_id': str(fid) if fid else None, 'title': file_name, 'name': file_name}
            )
            return Response(res, status=status.HTTP_200_OK)
        except SeedrError as e:
            return Response({"error": {"code": e.code, "message": e.message}}, status=status.HTTP_502_BAD_GATEWAY)

    def delete(self, request, id, fid=None):
        return self.get(request, id, fid)


class RenameFolder(APIView):
    """
    Renames a folder by ID.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        name = request.query_params.get('name') or request.data.get('name')
        if not name:
            return Response({"error": {"code": "VALIDATION_ERROR", "message": "Query parameter 'name' is required"}}, status=status.HTTP_400_BAD_REQUEST)
        try:
            service = get_seedr_service_for_user(request.user)
            res = service.rename_folder(id, name)
            log_activity_event(
                event_type='SEEDR_OP_SUCCESS',
                request=request,
                user=request.user,
                resource_type='Folder',
                resource_id=str(id),
                metadata={'action': 'rename_folder', 'id': str(id), 'new_name': str(name)}
            )
            return Response(res, status=status.HTTP_200_OK)
        except SeedrError as e:
            return Response({"error": {"code": e.code, "message": e.message}}, status=status.HTTP_502_BAD_GATEWAY)


class RenameFile(APIView):
    """
    Renames a file by ID.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        name = request.query_params.get('name') or request.data.get('name')
        if not name:
            return Response({"error": {"code": "VALIDATION_ERROR", "message": "Query parameter 'name' is required"}}, status=status.HTTP_400_BAD_REQUEST)
        try:
            service = get_seedr_service_for_user(request.user)
            res = service.rename_file(id, name)
            log_activity_event(
                event_type='SEEDR_OP_SUCCESS',
                request=request,
                user=request.user,
                resource_type='File',
                resource_id=str(id),
                metadata={'action': 'rename_file', 'id': str(id), 'new_name': str(name)}
            )
            return Response(res, status=status.HTTP_200_OK)
        except SeedrError as e:
            return Response({"error": {"code": e.code, "message": e.message}}, status=status.HTTP_502_BAD_GATEWAY)


class FolderArchive(APIView):
    """
    Requests a folder zip archive from Seedr.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        try:
            service = get_seedr_service_for_user(request.user)
            res = service.create_archive(id)
            log_activity_event(
                event_type='SEEDR_OP_SUCCESS',
                request=request,
                user=request.user,
                resource_type='FolderArchive',
                resource_id=str(id),
                metadata={'action': 'create_archive', 'folder_id': str(id)}
            )
            return Response(res, status=status.HTTP_200_OK)
        except SeedrError as e:
            return Response({"error": {"code": e.code, "message": e.message}}, status=status.HTTP_502_BAD_GATEWAY)

    def post(self, request, id):
        return self.get(request, id)


class AddFolder(APIView):
    """
    Creates a new folder in the user's Seedr account.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        name = request.query_params.get('name') or request.data.get('name')
        if not name:
            return Response({"error": {"code": "VALIDATION_ERROR", "message": "Query parameter 'name' is required"}}, status=status.HTTP_400_BAD_REQUEST)
        try:
            service = get_seedr_service_for_user(request.user)
            res = service.add_folder(name)
            log_activity_event(
                event_type='SEEDR_OP_SUCCESS',
                request=request,
                user=request.user,
                resource_type='Folder',
                resource_id=str(name),
                metadata={'action': 'add_folder', 'name': str(name)}
            )
            return Response(res, status=status.HTTP_200_OK)
        except SeedrError as e:
            return Response({"error": {"code": e.code, "message": e.message}}, status=status.HTTP_502_BAD_GATEWAY)

    def post(self, request):
        return self.get(request)


class SearchFiles(APIView):
    """
    Searches files and folders in the user's Seedr account.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q') or request.query_params.get('query', '')
        try:
            service = get_seedr_service_for_user(request.user)
            res = service.search_files(query)
            if query:
                log_activity_event(
                    event_type='FILE_ACCESSED',
                    request=request,
                    user=request.user,
                    resource_type='SeedrSearch',
                    metadata={'query': str(query)}
                )
            return Response(res, status=status.HTTP_200_OK)
        except SeedrError as e:
            return Response({"error": {"code": e.code, "message": e.message}}, status=status.HTTP_502_BAD_GATEWAY)


class LockFolderView(APIView):
    """
    Allows Admin to toggle lock on a folder to prevent accidental deletion.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        lock_obj = LockFolder.objects.filter(folder_id=str(id)).first()
        if lock_obj:
            lock_obj.delete()
            log_activity_event(
                event_type='SEEDR_OP_SUCCESS',
                request=request,
                user=request.user,
                resource_type='LockFolder',
                resource_id=str(id),
                metadata={'action': 'unlock_folder', 'folder_id': str(id)}
            )
            return Response({"detail": "Unlocked folder", "locked": False}, status=status.HTTP_200_OK)
        else:
            LockFolder.objects.create(folder_id=str(id))
            log_activity_event(
                event_type='SEEDR_OP_SUCCESS',
                request=request,
                user=request.user,
                resource_type='LockFolder',
                resource_id=str(id),
                metadata={'action': 'lock_folder', 'folder_id': str(id)}
            )
            return Response({"detail": "Locked folder", "locked": True}, status=status.HTTP_200_OK)

    def post(self, request, id):
        return self.get(request, id)


# ============================================================================
# Media & Provider Scraper Views
# ============================================================================

# Mirror Fallback Lists for Resilience
MOVIERULZ_DOMAINS = [
    os.getenv("MOVIERULZ_DOMAIN", "https://www.5movierulz.watch/").strip(),
    "https://www.5movierulz.watch/",
    "https://5movierulz.lat/",
    "https://www.5movierulz.vet/",
]

TAMILMV_DOMAINS = [
    os.getenv("TAMILMV_DOMAIN", "https://www.1tamilmv.cx/").strip(),
    "https://www.1tamilmv.cx/",
    "https://www.1tamilmv.ing/",
    "https://www.1tamilmv.tf/",
]

def fetch_with_mirrors(domains, path="", timeout=6):
    """Tries configured primary domain first, then fallback mirrors if connection fails."""
    if isinstance(domains, str):
        domains = [domains]
    for d in domains:
        if not d:
            continue
        try:
            url = f"{d.rstrip('/')}/{path.lstrip('/')}" if path else d
            r = requests.get(url, headers=HEADERS, timeout=timeout)
            if r.status_code == 200:
                return r, d
        except Exception as e:
            logger.debug(f"Mirror fetch failed for {d}: {e}")
            continue
    return None, None


def movierulz(r):
    try:
        category = r.GET.get('category', '')
        path = f"category/{category}" if category else ""
        res, base = fetch_with_mirrors(MOVIERULZ_DOMAINS, path)
        if not res:
            return JsonResponse({"movies": []})
        soup = bs(res.content, 'html.parser')
        container = soup.find('div', class_='home_style') or soup.find('div', class_='films') or soup.find(id='main')
        items = container.findAll('div', class_='boxed film') if container else soup.findAll('div', class_='boxed film')
        movies = []
        for i in items:
            a = i.find('a')
            img = i.find('img')
            raw_title = a.get('title', '') if a else ''
            link_href = a.get('href', '') if a else ''
            img_src = img.get('src', '') if img else ''

            if not raw_title:
                continue

            # Parse Quality
            q_match = re.search(r'\b(CAM|PreDVD|DVDScr|HDRip|DVDRip|BRRip|BluRay|WEB-DL|HQ|HDTS|HD)\b', raw_title, re.I)
            quality = q_match.group(1).upper() if q_match else 'HD'

            # Parse Language
            lang_match = re.search(r'\[(.*?)\]', raw_title)
            language = lang_match.group(1) if lang_match else ('Telugu' if 'telugu' in raw_title.lower() else 'Movie')

            # Parse Year
            year_match = re.search(r'\((19\d\d|20\d\d)\)', raw_title)
            year = year_match.group(1) if year_match else ''

            # Clean Name
            clean_name = re.sub(r'\[.*?\]|\(.*?\)|(CAM|PreDVD|DVDScr|HDRip|DVDRip|BRRip|BluRay|WEB-DL|HQ|HDTS|HD)', '', raw_title, flags=re.I).strip(' -')

            # Relative path
            rel_link = urlparse(link_href).path

            movies.append({
                "name": raw_title,
                "clean_name": clean_name or raw_title,
                "link": rel_link,
                "image": img_src,
                "quality": quality,
                "language": language,
                "year": year,
            })
        return JsonResponse({"movies": movies})
    except Exception as e:
        logger.error(f"Movierulz fetch error: {e}")
        return JsonResponse({"movies": []})


def movierulzmovie(r, slug="", id=None):
    raw_slug = slug or id or r.GET.get('link') or r.GET.get('slug') or ""
    path = str(raw_slug).lstrip('/')
    if path and not path.endswith('.html') and not path.startswith('category/'):
        path = f"{path}.html"

    try:
        res, base = fetch_with_mirrors(MOVIERULZ_DOMAINS, path)
        if not res:
            return JsonResponse({"links": [], "streams": [], "details": {}})
        soup = bs(res.content, 'html.parser')

        # Parse magnet download buttons - find all magnet links
        magnets = soup.find_all('a', href=lambda h: h and 'magnet:?' in h)
        links = []
        for i in magnets:
            raw_name = i.get_text().strip()
            clean_name = re.sub(r'[^\w\s\.\-\(\)]', '', raw_name).replace('GET THIS TORRENT', '').strip()
            href = i.get('href', '')
            parsed_qs = parse_qs(urlparse(href).query)
            dn = parsed_qs.get('dn', [''])[0]
            xl = parsed_qs.get('xl', [''])[0]

            size_match = re.search(r'(\d+(?:\.\d+)?\s*(?:gb|mb))', raw_name, re.I)
            size_str = size_match.group(1).upper() if size_match else ""
            if not size_str and xl and xl.isdigit():
                bytes_val = int(xl)
                if bytes_val > 1024 * 1024 * 1024:
                    size_str = f"{bytes_val / (1024**3):.1f} GB"
                else:
                    size_str = f"{bytes_val / (1024**2):.0f} MB"

            res_match = re.search(r'(1080p|720p|480p|320p|4k|uhd|2160p)', raw_name + " " + dn, re.I)
            res_str = res_match.group(1).upper() if res_match else "HD"

            links.append({
                "name": clean_name or dn or "Torrent Download",
                "link": href,
                "size": size_str,
                "resolution": res_str,
                "filename": dn,
            })

        details = {}
        title_el = soup.find('h2', class_='entry-title')
        raw_title = title_el.get_text().strip() if title_el else (path.replace('-', ' ').replace('.html', ''))
        details["name"] = raw_title

        # Parse Quality and Language from Title
        q_match = re.search(r'\b(CAM|PreDVD|DVDScr|HDRip|DVDRip|BRRip|BluRay|WEB-DL|HQ|HDTS|HD)\b', raw_title, re.I)
        details["quality"] = q_match.group(1).upper() if q_match else 'HD'

        img_el = soup.find('img', class_='attachment-post-thumbnail') or (soup.find('div', class_='entry-content').find('img') if soup.find('div', class_='entry-content') else None)
        details["image"] = img_el.get('src', '') if img_el else ""

        p_tags = soup.findAll('p')
        info_lines = []
        meta = {}
        desc_text = ""
        for i in p_tags:
            text = i.get_text().strip()
            if any(k in text.lower() for k in ["directed by", "starring", "genres", "country", "language", "quality", "categories"]):
                info_lines.append(text)
                for key in ["Directed by", "Starring by", "Genres", "Categories", "Country", "Language", "Quality"]:
                    if key.lower() in text.lower():
                        items_in_p = []
                        anchors = i.find_all('a')
                        if anchors:
                            for a in anchors:
                                a_text = a.get_text().strip()
                                a_href = a.get('href', '')
                                if a_text and not a_href.startswith('magnet:'):
                                    rel = urlparse(a_href).path.lstrip('/')
                                    items_in_p.append({"name": a_text, "link": rel})
                        if not items_in_p:
                            clean_val = text.split(':', 1)[-1].strip()
                            if clean_val:
                                items_in_p = [{"name": clean_val, "link": ""}]
                        if items_in_p:
                            meta[key] = items_in_p
            elif len(text) > 40 and not desc_text and not text.startswith("http"):
                desc_text = text

        details["info"] = info_lines
        details["meta"] = meta
        details["desc"] = desc_text

        current_user = r.user if hasattr(r, 'user') and getattr(r.user, 'is_authenticated', False) else None
        log_activity_event(
            event_type='SCRAPER_VIEW',
            request=r,
            user=current_user,
            resource_type='Movierulz',
            resource_id=str(path)[:100],
            metadata={'name': details.get('name', ''), 'path': path}
        )

        return JsonResponse({"links": links, "streams": [], "details": details})
    except Exception as e:
        logger.error(f"Movierulz movie fetch error: {e}")
        return JsonResponse({"links": [], "streams": [], "details": {}})


def movierulzsearch(r, query):
    try:
        movies = []
        seen_links = set()
        res, base = fetch_with_mirrors(MOVIERULZ_DOMAINS, f"search_movies?s={quote(query)}")
        if res and res.status_code == 200:
            soup = bs(res.content, 'html.parser')
            container = soup.find(id='main') or soup.find('div', class_='films') or soup.find('div', class_='home_style')
            items = container.findAll('div', class_='boxed film') if container else soup.findAll('div', class_='boxed film')
            for i in items:
                a = i.find('a')
                img = i.find('img')
                raw_title = a.get('title', '') if a else ''
                link_href = a.get('href', '') if a else ''
                img_src = img.get('src', '') if img else ''
                if not raw_title:
                    continue

                rel_link = urlparse(link_href).path
                if rel_link in seen_links:
                    continue
                seen_links.add(rel_link)

                q_match = re.search(r'\b(CAM|PreDVD|DVDScr|HDRip|DVDRip|BRRip|BluRay|WEB-DL|HQ|HDTS|HD)\b', raw_title, re.I)
                quality = q_match.group(1).upper() if q_match else 'HD'
                lang_match = re.search(r'\[(.*?)\]', raw_title)
                language = lang_match.group(1) if lang_match else 'Movie'
                year_match = re.search(r'\((19\d\d|20\d\d)\)', raw_title)
                year = year_match.group(1) if year_match else ''
                clean_name = re.sub(r'\[.*?\]|\(.*?\)|(CAM|PreDVD|DVDScr|HDRip|DVDRip|BRRip|BluRay|WEB-DL|HQ|HDTS|HD)', '', raw_title, flags=re.I).strip(' -')

                movies.append({
                    "name": raw_title,
                    "clean_name": clean_name or raw_title,
                    "link": rel_link,
                    "image": img_src,
                    "quality": quality,
                    "language": language,
                    "year": year,
                })

        # Fallback live index filter if search endpoint was empty/blocked
        if not movies:
            res_home, base_home = fetch_with_mirrors(MOVIERULZ_DOMAINS)
            if res_home and res_home.status_code == 200:
                soup = bs(res_home.content, 'html.parser')
                items = soup.select('.boxed.film')
                q_words = [w.lower() for w in query.strip().split() if len(w) > 1]
                for i in items:
                    a = i.find('a')
                    img = i.find('img')
                    raw_title = a.get('title', '') if a else ''
                    link_href = a.get('href', '') if a else ''
                    img_src = img.get('src', '') if img else ''
                    if not raw_title:
                        continue

                    rel_link = urlparse(link_href).path
                    if rel_link in seen_links:
                        continue

                    t_lower = raw_title.lower()
                    if query.lower() in t_lower or any(w in t_lower for w in q_words):
                        seen_links.add(rel_link)
                        q_match = re.search(r'\b(CAM|PreDVD|DVDScr|HDRip|DVDRip|BRRip|BluRay|WEB-DL|HQ|HDTS|HD)\b', raw_title, re.I)
                        quality = q_match.group(1).upper() if q_match else 'HD'
                        lang_match = re.search(r'\[(.*?)\]', raw_title)
                        language = lang_match.group(1) if lang_match else 'Movie'
                        year_match = re.search(r'\((19\d\d|20\d\d)\)', raw_title)
                        year = year_match.group(1) if year_match else ''
                        clean_name = re.sub(r'\[.*?\]|\(.*?\)|(CAM|PreDVD|DVDScr|HDRip|DVDRip|BRRip|BluRay|WEB-DL|HQ|HDTS|HD)', '', raw_title, flags=re.I).strip(' -')

                        movies.append({
                            "name": raw_title,
                            "clean_name": clean_name or raw_title,
                            "link": rel_link,
                            "image": img_src,
                            "quality": quality,
                            "language": language,
                            "year": year,
                        })

        current_user = r.user if hasattr(r, 'user') and getattr(r.user, 'is_authenticated', False) else None
        log_activity_event(
            event_type='SCRAPER_SEARCH',
            request=r,
            user=current_user,
            resource_type='Movierulz',
            resource_id=str(query)[:100],
            metadata={'query': str(query), 'results_count': len(movies)}
        )

        return JsonResponse({"movies": movies})
    except Exception as e:
        logger.error(f"Movierulz search error: {e}")
        return JsonResponse({"movies": []})


def special(r, slug="", id=None):
    path = str(slug or id or r.GET.get('path') or "").lstrip('/')
    try:
        movies = []
        seen_links = set()
        res, base = fetch_with_mirrors(MOVIERULZ_DOMAINS, path)
        if res and res.status_code == 200:
            soup = bs(res.content, 'html.parser')
            items = soup.select('.boxed.film') or soup.find_all('div', class_='boxed film')
            for i in items:
                a = i.find('a')
                img = i.find('img')
                raw_title = a.get('title', '') if a else ''
                link_href = a.get('href', '') if a else ''
                img_src = img.get('src', '') if img else ''
                if not raw_title or not link_href:
                    continue

                rel_link = urlparse(link_href).path
                if rel_link in seen_links:
                    continue
                seen_links.add(rel_link)

                q_match = re.search(r'\b(CAM|PreDVD|DVDScr|HDRip|DVDRip|BRRip|BluRay|WEB-DL|HQ|HDTS|HD)\b', raw_title, re.I)
                quality = q_match.group(1).upper() if q_match else 'HD'
                lang_match = re.search(r'\[(.*?)\]', raw_title)
                language = lang_match.group(1) if lang_match else 'Movie'
                year_match = re.search(r'\((19\d\d|20\d\d)\)', raw_title)
                year = year_match.group(1) if year_match else ''
                clean_name = re.sub(r'\[.*?\]|\(.*?\)|(CAM|PreDVD|DVDScr|HDRip|DVDRip|BRRip|BluRay|WEB-DL|HQ|HDTS|HD)', '', raw_title, flags=re.I).strip(' -')

                movies.append({
                    "name": raw_title,
                    "clean_name": clean_name or raw_title,
                    "link": rel_link,
                    "image": img_src,
                    "quality": quality,
                    "language": language,
                    "year": year,
                })

        # Fallback for actor/director if blocked by mirror: search by query
        if not movies and ('actor/' in path or 'director/' in path):
            name_query = path.split('/')[-1].replace('-', ' ')
            return movierulzsearch(r, name_query)

        title = path.split('/')[-1].replace('-', ' ').title()
        return JsonResponse({"movies": movies, "title": title})
    except Exception as e:
        logger.error(f"Movierulz special fetch error: {e}")
        return JsonResponse({"movies": [], "title": ""})


def tamilmv(r):
    try:
        res, base = fetch_with_mirrors(TAMILMV_DOMAINS)
        if not res:
            return JsonResponse({"items": []})
        soup = bs(res.content, 'html.parser')

        topic_links = soup.select('a[href*="/forums/topic/"]')
        seen = set()
        feed_items = []
        known_languages = ['Telugu', 'Tamil', 'Hindi', 'Malayalam', 'Kannada', 'English', 'Bengali', 'Marathi']

        for a in topic_links:
            href = a.get('href', '')
            text = a.get_text(strip=True)
            if not href or href in seen:
                continue
            seen.add(href)

            match = re.search(r'/forums/topic/(\d+)-(.*?)/?$', href)
            if not match:
                continue

            topic_id = match.group(1)
            slug = match.group(2)

            # Skip non-movie meta topics
            if any(skip in slug.lower() for skip in ['rules', 'request', 'how-to', 'telegram', 'password', 'contact', 'vpn', 'chat']):
                continue

            # Year
            year_match = re.search(r'(19\d\d|20\d\d)', slug)
            year = year_match.group(1) if year_match else ''

            # Multi-Language Detection
            lower_str = (text + " " + slug).lower()
            matched_langs = []
            for l in known_languages:
                if l.lower() in lower_str or (l == 'English' and 'eng' in lower_str):
                    matched_langs.append(l)
            if not matched_langs:
                matched_langs = ['Multi']

            # Quality
            q_match = re.search(r'\b(predvd|dvdscr|hdrip|web-dl|bluray|hdts|cam|true-web-dl)\b', slug, re.I)
            quality = q_match.group(1).upper().replace('-', ' ') if q_match else 'HD'

            clean_title = text if len(text) > 10 and not text.startswith('[') else slug.replace('-', ' ').title()

            feed_items.append({
                "topic_id": topic_id,
                "name": clean_title,
                "slug": slug,
                "link": href,
                "languages": matched_langs,
                "language": matched_langs[0],
                "quality": quality,
                "year": year,
            })

        return JsonResponse({"items": feed_items})
    except Exception as e:
        logger.error(f"Tamilmv fetch error: {e}")
        return JsonResponse({"items": []})


def tamilmvmovie(r, slug="", id=None):
    link = r.GET.get('link') or slug or id
    if not link:
        return JsonResponse({"title": "", "links": [], "images": [], "details": {}})

    # If relative topic link or slug passed, resolve to absolute URL
    if not str(link).startswith('http'):
        link = f"https://www.1tamilmv.ing/index.php?/forums/topic/{str(link).lstrip('/')}"

    try:
        req = requests.get(link, headers=HEADERS, timeout=10)
        soup = bs(req.content, 'html.parser')

        post = soup.find('div', class_='cPost_contentWrap') or soup.find('div', class_='ipsType_richText')
        anchors = post.find_all('a') if post else soup.find_all('a')

        links = []
        for idx, a in enumerate(anchors):
            href = a.get('href', '')
            if href and 'magnet:?' in href:
                # Find matching direct link immediately succeeding this magnet
                direct_link = ""
                for next_a in anchors[idx+1:idx+4]:
                    next_href = next_a.get('href', '')
                    if any(k in next_href.lower() for k in ['cyberloom', '/l/', 'direct', 'fasts', 'gdtot', 'hubcloud']):
                        direct_link = next_href
                        break

                parsed_qs = parse_qs(urlparse(href).query)
                dn = parsed_qs.get('dn', [''])[0]
                xl = parsed_qs.get('xl', [''])[0]

                size_match = re.search(r'(\d+(?:\.\d+)?\s*(?:gb|mb))', dn, re.I)
                size_str = size_match.group(1).upper() if size_match else ""
                if not size_str and xl and xl.isdigit():
                    bytes_val = int(xl)
                    if bytes_val > 1024 * 1024 * 1024:
                        size_str = f"{bytes_val / (1024**3):.1f} GB"
                    else:
                        size_str = f"{bytes_val / (1024**2):.0f} MB"

                res_match = re.search(r'(1080p|720p|480p|320p|4k|uhd|2160p)', dn, re.I)
                res_str = res_match.group(1).upper() if res_match else "HD"

                clean_label = dn.replace('www.1TamilMV.ing - ', '').replace('www.1TamilMV.cx - ', '')

                links.append({
                    "name": clean_label or dn or "Torrent Download",
                    "link": href,
                    "direct_link": direct_link,
                    "size": size_str,
                    "resolution": res_str,
                    "filename": dn,
                })

        # Extract Screenshots & Posters
        raw_imgs = post.find_all('img') if post else soup.find_all('img', class_='ipsImage')
        images = []
        for img in raw_imgs:
            src = img.get('data-src') or img.get('src')
            if src and not any(skip in src.lower() for skip in ['emoji', 'gif', 'reactions', 'avatar', 'logo']):
                images.append({"link": src})

        title_el = soup.find('h1') or soup.find('title')
        title = title_el.get_text().strip() if title_el else "TamilMV Release"

        current_user = r.user if hasattr(r, 'user') and getattr(r.user, 'is_authenticated', False) else None
        log_activity_event(
            event_type='SCRAPER_VIEW',
            request=r,
            user=current_user,
            resource_type='TamilMV',
            resource_id=str(link)[:100],
            metadata={'title': title, 'link': link}
        )

        return JsonResponse({"title": title, "links": links, "images": images, "details": {"name": title}})
    except Exception as e:
        logger.error(f"Tamilmv movie fetch error: {e}")
        return JsonResponse({"title": "", "links": [], "images": [], "details": {}})


def ibomma(r):
    try:
        req = requests.get("https://rto.bappam.eu/telugu-movies/", headers=HEADERS, timeout=10)
        soup = bs(req.content, 'html.parser')
        items = soup.find_all('article')
        movies = []
        for i in items:
            try:
                title = i.h3.a.get_text() if i.h3 and i.h3.a else (i.h2.a.get_text() if i.h2 and i.h2.a else "")
                link = i.a.get('href') if i.a else ""
                img = i.img.get('data-src') or i.img.get('src') if i.img else ""
                movies.append({"name": title, "image": img, "link": link})
            except Exception:
                pass
        return JsonResponse({"movies": movies})
    except Exception as e:
        logger.error(f"IBomma fetch error: {e}")
        return JsonResponse({"movies": []})


def ibommamovie(r):
    link = r.GET.get('link')
    if not link:
        return JsonResponse({})
    try:
        req = requests.get(link, headers=HEADERS, timeout=10)
        soup = bs(req.content, 'html.parser')
        name_el = soup.find("h2", class_="entry-title-movie") or soup.find("div", class_="entry-title-movie")
        genres = soup.findAll("div", class_="entry-tags-movies")
        cast = soup.find("div", class_="cast-and-director")
        director = soup.find("div", class_="movies-director")
        description = soup.find("div", class_="additional-info")
        trailer = soup.find("a", class_="button-trailer-css")
        scripts = soup.find_all('script', string=re.compile('lazyIframe.src'))
        image = soup.find('img', class_="entry-thumb")

        video_link = ""
        for i in scripts:
            match = re.search(r"lazyIframe\.src\s*=\s*'([^']*)'", i.string)
            if match:
                video_link = match.group(1)

        details = {
            "name": name_el.get_text() if name_el else "",
            "genre": genres[-1].get_text() if genres else "",
            "cast": cast.get_text() if cast else "",
            "director": director.get_text() if director else "",
            "desc": description.get_text() if description else "",
            "trailer": trailer.get('href') if trailer else "",
            "image": image.get('src') if image else "",
            "link": video_link,
            "dlink": link
        }
        return JsonResponse(details)
    except Exception as e:
        logger.error(f"IBomma movie fetch error: {e}")
        return JsonResponse({})


TD_DOMAINS = [
    "https://www.torrentdownloads.pro",
    "https://torrentdownloads.pro",
    "https://www.torrentdownloads.me",
]
TD_CLOUDFLARE_IPS = ["104.26.12.134", "104.26.13.134", "172.67.70.47"]


def fetch_td(path=""):
    """
    Fetches torrentdownloads.pro using Cloudflare DoH IP resolution to bypass local DNS blocks.
    """
    clean_path = str(path).lstrip('/')
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Host": "www.torrentdownloads.pro",
    }

    import socket
    orig_getaddrinfo = socket.getaddrinfo

    # 1. Prioritize Cloudflare DoH IP resolution (instant, bypasses ISP DNS block)
    for ip in TD_CLOUDFLARE_IPS:
        def patched_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
            if "torrentdownloads" in host:
                return [(socket.AF_INET, socket.SOCK_STREAM, 6, '', (ip, port))]
            return orig_getaddrinfo(host, port, family, type, proto, flags)

        socket.getaddrinfo = patched_getaddrinfo
        try:
            url = f"https://www.torrentdownloads.pro/{clean_path}" if clean_path else "https://www.torrentdownloads.pro"
            r = requests.get(url, headers=headers, timeout=(3.0, 7.0))
            if r.status_code == 200:
                return r
        except Exception:
            pass
        finally:
            socket.getaddrinfo = orig_getaddrinfo

    # 2. Fallback to standard request
    for domain in TD_DOMAINS:
        url = f"{domain}/{clean_path}" if clean_path else domain
        try:
            r = requests.get(url, headers=headers, timeout=(2.0, 4.0))
            if r.status_code == 200:
                return r
        except Exception:
            pass

    return None


def torrent_search(r):
    query = r.GET.get('query') or r.GET.get('q') or r.GET.get('search') or ''
    page = r.GET.get('page') or '1'
    if not query:
        return JsonResponse({"torrents": [], "total_results": 0, "current_page": 1, "total_pages": 1})

    try:
        search_path = f"search/?new=1&s_cat=0&search={quote(query)}&page={page}"
        res = fetch_td(search_path)
        if not res or res.status_code != 200:
            return JsonResponse({"torrents": [], "total_results": 0, "current_page": int(page), "total_pages": 1})

        soup = bs(res.content, 'html.parser')
        torrents = []
        seen_links = set()

        for div in soup.find_all('div', class_=re.compile(r'grey_bar')):
            a = div.find('a', href=lambda h: h and '/torrent/' in h)
            if not a:
                continue

            title = a.get_text(strip=True)
            link = a.get('href', '')
            if not link or title.isdigit() or title == '0' or 'disqus_thread' in link:
                continue

            if link in seen_links:
                continue
            seen_links.add(link)

            # Extract size, seeds, leech
            spans = div.find_all('span')
            span_texts = [s.get_text(strip=True) for s in spans if s.get_text(strip=True)]

            # In TD HTML table: spans are [leech, seeds, size]
            size_str = ""
            num_spans = []
            for st in span_texts:
                if any(u in st.upper() for u in ['MB', 'GB', 'KB', 'TB', 'BYTES']):
                    size_str = st.replace('\xa0', ' ')
                elif st.isdigit():
                    num_spans.append(st)

            leech_val = num_spans[0] if len(num_spans) > 0 else "0"
            seeds_val = num_spans[1] if len(num_spans) > 1 else (num_spans[0] if len(num_spans) == 1 else "0")

            # Health indicator
            health_img = div.find('img', src=lambda s: s and 'health' in s)
            health_val = "10"
            if health_img:
                h_match = re.search(r'health_(\d+)', health_img.get('src', ''))
                health_val = h_match.group(1) if h_match else "10"

            # Resolution detection
            res_match = re.search(r'\b(1080p|720p|480p|320p|4k|uhd|2160p|bluray|web-dl|hdrip|dvdrip|cam)\b', title, re.I)
            res_tag = res_match.group(1).upper() if res_match else "HD"

            torrents.append({
                "title": title,
                "link": link,
                "size": size_str or "Unknown",
                "seeds": seeds_val,
                "leech": leech_val,
                "health": health_val,
                "resolution": res_tag,
            })

        # Parse total results and total pages from HTML
        num_span = soup.select_one('h1 span.num') or soup.select_one('.title_bar1 span.num')
        total_count = int(num_span.get_text(strip=True)) if num_span and num_span.get_text(strip=True).isdigit() else 0
        if not total_count:
            m = re.search(r'total\s*(\d+)\s*torrents', soup.get_text())
            if m:
                total_count = int(m.group(1))
            else:
                total_count = len(torrents)

        import math
        total_pages = max(1, math.ceil(total_count / 50)) if total_count > 0 else 1
        pag_box = soup.find('div', class_='pagination_box')
        if pag_box:
            for a in pag_box.find_all('a'):
                t = a.get_text(strip=True)
                if t.isdigit():
                    total_pages = max(total_pages, int(t))

        current_user = r.user if hasattr(r, 'user') and getattr(r.user, 'is_authenticated', False) else None
        log_activity_event(
            event_type='SCRAPER_SEARCH',
            request=r,
            user=current_user,
            resource_type='TorrentSearch',
            resource_id=str(query)[:100],
            metadata={'query': str(query), 'page': str(page), 'results_count': len(torrents), 'total_results': total_count}
        )

        return JsonResponse({
            "torrents": torrents,
            "total_results": total_count,
            "current_page": int(page) if str(page).isdigit() else 1,
            "total_pages": total_pages,
        })
    except Exception as e:
        logger.error(f"Torrent search error: {e}")
        return JsonResponse({"torrents": [], "total_results": 0, "current_page": 1, "total_pages": 1})


def torrent_magnet(r):
    link = r.GET.get('link') or r.GET.get('path') or ''
    if not link:
        return JsonResponse({"error": "Link parameter required", "magnet": ""})

    try:
        res = fetch_td(link)
        if not res or res.status_code != 200:
            return JsonResponse({"error": "Failed to fetch torrent details", "magnet": ""})

        soup = bs(res.content, 'html.parser')
        magnet_a = soup.find('a', href=lambda h: h and 'magnet:?' in h)
        magnet_uri = magnet_a.get('href') if magnet_a else ""

        if not magnet_uri:
            # Fallback to infohash search in page text
            hash_match = re.search(r'infohash:?\s*([a-fA-F0-9]{40})', res.text, re.I)
            if hash_match:
                ih = hash_match.group(1)
                magnet_uri = f"magnet:?xt=urn:btih:{ih}"

        title_el = soup.find('h1') or soup.find('title')
        title = title_el.get_text().strip() if title_el else "Torrent"

        return JsonResponse({"magnet": magnet_uri, "title": title})
    except Exception as e:
        logger.error(f"Torrent magnet fetch error: {e}")
        return JsonResponse({"error": str(e), "magnet": ""})


def mainsearch(r):
    return torrent_search(r)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def contact(request):
    serializer = ContactSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({'status': 'true', 'message': 'Message received'}, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def y2mate(r):
    link = r.GET.get("link", "")
    try:
        res = requests.post("https://in76.y2mates.com/mates/analyzeV2/ajax", data={"k_query": link}, timeout=10)
        return JsonResponse(res.json())
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=502)


def y2matedownload(r):
    vid = r.GET.get("vid", "")
    link = r.GET.get("link", "")
    try:
        res = requests.post("https://in76.y2mates.com/mates/convertV2/index", data={"vid": vid, "k": link}, timeout=10)
        return JsonResponse(res.json())
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=502)


YT_MATE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0.0.0 Safari/537.36",
    "Origin": "https://frame.y2meta-uk.com",
    "Referer": "https://frame.y2meta-uk.com/",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.8",
    "Sec-Ch-Ua": '"Not=A?Brand";v="99", "Brave";v="151", "Chromium";v="151"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Gpc": "1",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "cross-site",
    "Priority": "u=1, i",
}


def _ytmate_video_id(value):
    match = re.search(r"(?:v=|/|embed/|youtu\.be/)([0-9A-Za-z_-]{11})", value or "")
    return match.group(1) if match else None


def ytmate_info(request):
    video_id = _ytmate_video_id(request.GET.get("url", ""))
    print(f"[YT MATE] info requested video_id={video_id}", flush=True)
    if not video_id:
        return JsonResponse({"error": "Invalid YouTube URL"}, status=400)
    try:
        request_client = curl_requests if curl_requests is not None else requests
        request_kwargs = {'impersonate': 'chrome'} if curl_requests is not None else {}
        response = request_client.get(
            f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json",
            timeout=10,
            **request_kwargs,
        )
        print(f"[YT MATE] oembed status={response.status_code}", flush=True)
        if response.status_code != 200:
            return JsonResponse({"error": "Failed to fetch YouTube video details"}, status=502)
        data = response.json()
        if not isinstance(data, dict):
            print(f"[YT MATE] oembed unexpected response type={type(data).__name__}", flush=True)
            return JsonResponse({"error": "Invalid YouTube metadata response"}, status=502)
        return JsonResponse({
            "video_id": video_id,
            "title": data.get("title", "YouTube Video"),
            "thumbnail_url": data.get("thumbnail_url", ""),
            "author_name": data.get("author_name", ""),
        })
    except requests.RequestException as exc:
        logger.error("YT Mate info error: %s", exc)
        return JsonResponse({"error": "Could not fetch YouTube video details"}, status=502)
    except Exception:
        print(f"[YT MATE] info unexpected error:\n{traceback.format_exc()}", flush=True)
        logger.exception("YT Mate info unexpected error")
        return JsonResponse({"error": "YT Mate metadata request failed"}, status=502)


def ytmate_convert(request):
    video_id = request.GET.get("video_id", "").strip()
    media_format = request.GET.get("format", "mp4").strip().lower()
    quality = request.GET.get("quality", "720").strip()
    print(
        f"[YT MATE] convert requested video_id={video_id} format={media_format} quality={quality}",
        flush=True,
    )
    if not re.fullmatch(r"[0-9A-Za-z_-]{11}", video_id) or media_format not in ("mp3", "mp4"):
        return JsonResponse({"error": "Invalid YT Mate conversion request"}, status=400)

    if curl_requests is not None:
        print('[YT MATE] using curl_cffi Chrome impersonation', flush=True)
        session = curl_requests.Session(impersonate='chrome')
    else:
        print('[YT MATE] curl_cffi unavailable; using standard requests', flush=True)
        session = requests.Session()
    try:
        key_response = session.get(
            f"https://cnv.cx/v2/sanity/key?id={video_id}",
            headers=YT_MATE_HEADERS,
        )
        print(f"Key response {key_response.text}")
        print(f"[YT MATE] sanity status={key_response.status_code}", flush=True)
        try:
            key_data = key_response.json() if key_response.status_code == 200 else {}
        except ValueError:
            key_data = {}
        api_key = key_data.get("key") if isinstance(key_data, dict) else None
        print(f"[YT MATE] sanity response_has_key={bool(api_key)}", flush=True)
        if not api_key:
            logger.warning(
                "YT Mate key request failed: status=%s body=%s",
                key_response.status_code,
                key_response.text[:200],
            )
            return _ytmate_ytdlp_fallback(video_id, media_format, quality)

        headers = YT_MATE_HEADERS.copy()
        headers.update({"Content-Type": "application/x-www-form-urlencoded", "Key": api_key})
        response = session.post(
            "https://cnv.cx/v2/converter",
            data={
                "link": f"https://youtu.be/{video_id}",
                "format": media_format,
                "audioBitrate": quality if media_format == "mp3" else "128",
                "videoQuality": quality if media_format == "mp4" else "720",
                "filenameStyle": "pretty",
                "vCodec": "h264",
                "key": api_key,
            },
            headers=headers,
        )
        print(f"[YT MATE] converter status={response.status_code}", flush=True)
        try:
            data = response.json()
        except ValueError:
            logger.warning(
                "YT Mate converter returned non-JSON: status=%s body=%s",
                response.status_code,
                response.text[:200],
            )
            print(
                f"[YT MATE] converter non-JSON response status={response.status_code}; using fallback",
                flush=True,
            )
            return _ytmate_ytdlp_fallback(video_id, media_format, quality)
        if not isinstance(data, dict):
            print(f"[YT MATE] converter unexpected response type={type(data).__name__}", flush=True)
            return _ytmate_ytdlp_fallback(video_id, media_format, quality)
        if response.status_code != 200 or data.get("error") or not data.get("url"):
            logger.warning(
                "YT Mate converter failed: status=%s error=%s",
                response.status_code,
                data.get("errorMsg") or data.get("error"),
            )
            return _ytmate_ytdlp_fallback(video_id, media_format, quality)
        return JsonResponse({"download_url": data.get("url"), "filename": data.get("filename")})
    except (requests.RequestException, ValueError) as exc:
        logger.error("YT Mate conversion error: %s", exc)
        return _ytmate_ytdlp_fallback(video_id, media_format, quality)
    except Exception:
        print(f"[YT MATE] convert unexpected error:\n{traceback.format_exc()}", flush=True)
        logger.exception("YT Mate conversion unexpected error")
        return _ytmate_ytdlp_fallback(video_id, media_format, quality)


def _ytmate_ytdlp_fallback(video_id, media_format, quality):
    """Use the existing yt-dlp stream route when the external converter blocks Vercel."""
    quality_value = re.sub(r'[^0-9]', '', quality) or '720'
    if media_format == 'mp3':
        format_id = 'bestaudio/best'
        extension = 'm4a'
    else:
        format_id = f'best[height<={quality_value}]/best'
        extension = 'mp4'

    filename = f'youtube_{quality_value}.{extension}'
    print(
        f"[YT MATE] using yt-dlp fallback format={format_id} filename={filename}",
        flush=True,
    )
    stream_url = (
        f'/react/youtube/stream/?id={quote(video_id)}'
        f'&format_id={quote(format_id)}&ext={extension}'
        f'&filename={quote(filename)}'
    )
    return JsonResponse({
        'download_url': stream_url,
        'filename': filename,
        'fallback': True,
    })


class LiveTVChannelsView(APIView):
    """
    Returns categorized Indian Live TV channels with search and category filtering.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from scrapers.livetv_service import get_live_tv_channels
        
        force_refresh = request.query_params.get('refresh', '').lower() in ('true', '1', 'yes')
        category = request.query_params.get('category', '').strip()
        search = request.query_params.get('search', '').strip().lower()

        data = get_live_tv_channels(force_refresh=force_refresh)
        channels = data.get('channels', [])

        if category and category != 'All':
            channels = [c for c in channels if c.get('category', '').lower() == category.lower()]

        if search:
            channels = [
                c for c in channels
                if search in c.get('name', '').lower() or search in c.get('category', '').lower()
            ]

        return Response({
            "total": len(channels),
            "grand_total": data.get("total", len(channels)),
            "categories": data.get("categories", []),
            "channels": channels
        }, status=status.HTTP_200_OK)


class LiveTVStreamProxyView(APIView):
    """
    Optional CORS and header proxy for IPTV HLS streams and segments.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.http import HttpResponse, StreamingHttpResponse
        target_url = request.query_params.get('url', '').strip()
        if not target_url or not (target_url.startswith('http://') or target_url.startswith('https://')):
            return Response({"error": "Invalid or missing url parameter"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            req_headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': target_url,
                'Origin': urlparse(target_url).scheme + "://" + urlparse(target_url).netloc,
            }
            resp = requests.get(target_url, headers=req_headers, stream=True, timeout=10)
            
            content_type = resp.headers.get('content-type', 'application/vnd.apple.mpegurl')
            
            if 'mpegurl' in content_type or target_url.endswith('.m3u8'):
                text = resp.text
                return HttpResponse(text, content_type=content_type, status=resp.status_code)
            
            return StreamingHttpResponse(
                resp.iter_content(chunk_size=8192),
                content_type=content_type,
                status=resp.status_code
            )
        except Exception as e:
            logger.error(f"Live TV proxy error for {target_url}: {e}")
            return Response({"error": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

