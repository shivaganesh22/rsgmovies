import logging
from typing import Optional, Dict, Any, List
from django.db import transaction
from django.utils import timezone

from seedrcc import Seedr, Token, exceptions as seedr_exc, models as seedr_models
from seedr_service.models import SeedrAccount
from seedr_service.exceptions import (
    SeedrError,
    SeedrAuthError,
    SeedrNetworkError,
    SeedrUnavailableError,
    SeedrAPIError,
    SeedrTokenError,
    SeedrNotFoundError,
    SeedrOperationError,
)

logger = logging.getLogger(__name__)


class SeedrService:
    """
    Centralized service layer for interacting with Seedr using seedrcc v2.1.2.
    Encapsulates:
    - Token lifecycle: Stored token -> Auto-refresh persistence -> Password fallback.
    - Automatic token persistence callback with DB locking.
    - Complete API surface matching seedrcc v2.1.2.
    - Standardized error mapping and response normalization.
    """

    def __init__(self, account: SeedrAccount):
        self.account = account
        self._client: Optional[Seedr] = None

    def __enter__(self):
        self.get_client()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def close(self):
        """Closes the underlying HTTP client if active."""
        if self._client:
            try:
                self._client.close()
            except Exception as e:
                logger.debug(f"Error closing Seedr client for {self.account.name}: {e}")
            self._client = None

    def _token_refresh_callback(self, new_token: Token):
        """
        Callback invoked by seedrcc whenever an access token is refreshed.
        Persists the updated credentials securely to the database with transaction locking.
        """
        try:
            logger.info(f"Seedr token refreshed for account '{self.account.name}'")
            with transaction.atomic():
                # Lock row to prevent race conditions during concurrent token refreshes
                acc = SeedrAccount.objects.select_for_update().get(pk=self.account.pk)

                if new_token.access_token:
                    acc.access_token = new_token.access_token
                # Preserve existing refresh token if callback receives None
                if new_token.refresh_token:
                    acc.refresh_token = new_token.refresh_token
                if new_token.device_code:
                    acc.device_code = new_token.device_code

                now = timezone.now()
                acc.last_token_refresh = now
                acc.last_authenticated = now
                acc.status = 'ACTIVE'
                acc.last_error = None
                acc.last_error_type = None

                acc.save(update_fields=[
                    'encrypted_access_token',
                    'encrypted_refresh_token',
                    'encrypted_device_code',
                    'last_token_refresh',
                    'last_authenticated',
                    'status',
                    'last_error',
                    'last_error_type',
                    'updated_at'
                ])

                # Sync local in-memory account
                self.account.encrypted_access_token = acc.encrypted_access_token
                self.account.encrypted_refresh_token = acc.encrypted_refresh_token
                self.account.encrypted_device_code = acc.encrypted_device_code
                self.account.status = 'ACTIVE'
        except Exception as e:
            logger.error(f"Failed to persist refreshed Seedr token for {self.account.name}: {e}")

    def _record_account_error(self, message: str, error_type: str, status: Optional[str] = None):
        """Records a timestamped diagnostic error message on the SeedrAccount model."""
        try:
            now = timezone.now()
            self.account.last_error = message
            self.account.last_error_type = error_type
            self.account.last_error_at = now
            update_fields = ['last_error', 'last_error_type', 'last_error_at', 'updated_at']
            if status:
                self.account.status = status
                update_fields.append('status')
            self.account.save(update_fields=update_fields)
        except Exception as e:
            logger.error(f"Failed to update error status for Seedr account {self.account.name}: {e}")

    def get_client(self, force_password_auth: bool = False) -> Seedr:
        """
        Retrieves or initializes an authenticated Seedr client following the lifecycle:
        1. Reuse active in-memory client if available and not forced.
        2. Construct client from stored Token(access_token, refresh_token, device_code)
           with on_token_refresh callback (Zero roundtrip initialization).
        3. If no access token exists but refresh token is present:
           Use Seedr.from_refresh_token().
        4. If token authorization fails (AuthenticationError) or is missing:
           Fallback to Seedr.from_password().
        5. If password authentication fails:
           Mark account as AUTH_ERROR and raise SeedrAuthError without retrying in a storm.
        """
        if self._client and not force_password_auth:
            return self._client

        # Strategy 1: Stored Token Restoration (Preferred, zero extra HTTP requests)
        if not force_password_auth:
            raw_access = self.account.access_token
            raw_refresh = self.account.refresh_token
            raw_device = self.account.device_code

            if raw_access or raw_refresh:
                try:
                    token = Token(
                        access_token=raw_access or "",
                        refresh_token=raw_refresh or "",
                        device_code=raw_device or None,
                    )
                    if raw_access:
                        client = Seedr(token=token, on_token_refresh=self._token_refresh_callback, timeout=30.0)
                        self._client = client
                        return client
                    elif raw_refresh:
                        client = Seedr.from_refresh_token(
                            raw_refresh,
                            on_token_refresh=self._token_refresh_callback,
                            timeout=30.0
                        )
                        self._client = client
                        return client
                except seedr_exc.AuthenticationError as e:
                    logger.warning(
                        f"Stored token authentication failed for Seedr account '{self.account.name}': {e}. "
                        f"Attempting password fallback."
                    )
                except (seedr_exc.NetworkError, seedr_exc.ServerError) as e:
                    logger.error(f"Network/server error initializing Seedr client for '{self.account.name}': {e}")
                    raise SeedrNetworkError(f"Could not connect to Seedr upstream service: {str(e)}")

        # Strategy 2: Password Authentication Fallback
        username = self.account.username
        password = self.account.password

        if not username or not password:
            self._record_account_error("Missing username or password configuration", "AuthenticationError", status='AUTH_ERROR')
            raise SeedrAuthError(f"Seedr credentials missing for account '{self.account.name}'.")

        try:
            client = Seedr.from_password(
                username=username,
                password=password,
                on_token_refresh=self._token_refresh_callback,
                timeout=30.0
            )
            self._client = client

            # Persist newly acquired tokens immediately
            if client.token:
                self._token_refresh_callback(client.token)

            return self._client
        except seedr_exc.AuthenticationError as e:
            error_msg = f"Invalid Seedr credentials for account '{self.account.name}'."
            logger.error(f"Seedr password authentication failed for '{self.account.name}': {e}")
            self._record_account_error(error_msg, "AuthenticationError", status='AUTH_ERROR')
            raise SeedrAuthError(error_msg)
        except seedr_exc.NetworkError as e:
            self._record_account_error(f"Network error connecting to Seedr: {str(e)}", "NetworkError")
            raise SeedrNetworkError(f"Could not reach Seedr servers: {str(e)}")
        except seedr_exc.ServerError as e:
            self._record_account_error(f"Seedr upstream server error: {str(e)}", "ServerError")
            raise SeedrUnavailableError(f"Seedr upstream server error: {str(e)}")
        except Exception as e:
            self._record_account_error(f"Unexpected Seedr authentication error: {str(e)}", type(e).__name__)
            raise SeedrError(f"Seedr error: {str(e)}")

    def _execute(self, func_callable):
        """
        Executes a seedrcc call, mapping seedrcc.exceptions into our clean domain exceptions.
        Handles one-shot token recovery if an unexpected 401 occurs.
        """
        client = self.get_client()
        try:
            return func_callable(client)
        except seedr_exc.AuthenticationError as e:
            logger.warning(f"Seedr operation received AuthenticationError for '{self.account.name}'. Retrying via password auth...")
            try:
                client = self.get_client(force_password_auth=True)
                return func_callable(client)
            except seedr_exc.AuthenticationError as auth_err:
                self._record_account_error(f"Authentication failed: {str(auth_err)}", "AuthenticationError", status='AUTH_ERROR')
                raise SeedrAuthError(f"Seedr authentication failed for '{self.account.name}'.")
        except seedr_exc.NetworkError as e:
            logger.error(f"Seedr NetworkError on account '{self.account.name}': {e}")
            raise SeedrNetworkError(f"Network communication with Seedr failed: {str(e)}")
        except seedr_exc.ServerError as e:
            logger.error(f"Seedr ServerError on account '{self.account.name}': {e}")
            raise SeedrUnavailableError(f"Seedr service temporarily unavailable: {str(e)}")
        except seedr_exc.TokenError as e:
            logger.error(f"Seedr TokenError on account '{self.account.name}': {e}")
            raise SeedrTokenError(f"Seedr token processing error: {str(e)}")
        except seedr_exc.APIError as e:
            logger.error(f"Seedr APIError on account '{self.account.name}': {e}")
            err_msg = str(e)
            if "not found" in err_msg.lower() or "404" in err_msg:
                raise SeedrNotFoundError(f"Requested Seedr item was not found: {err_msg}")
            raise SeedrAPIError(f"Seedr API error: {err_msg}")
        except seedr_exc.SeedrError as e:
            logger.error(f"Generic SeedrError on account '{self.account.name}': {e}")
            raise SeedrError(f"Seedr error: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected exception during Seedr call on account '{self.account.name}': {e}")
            raise SeedrOperationError(f"Seedr operation failed: {str(e)}")

    # =========================================================================
    # File & Folder Operations
    # =========================================================================

    def list_contents(self, folder_id: Optional[Any] = None) -> Dict[str, Any]:
        """
        Lists files, folders, and torrents in the root folder or a specified subfolder.
        Returns a normalized JSON-serializable dictionary.
        """
        f_id = str(folder_id) if folder_id is not None and str(folder_id) != "0" else "0"

        def _call(client: Seedr):
            res = client.list_contents(folder_id=f_id)
            if hasattr(res, '_raw') and isinstance(res._raw, dict):
                data = dict(res._raw)
            elif isinstance(res, dict):
                data = dict(res)
            else:
                data = {
                    "id": getattr(res, 'id', f_id),
                    "name": getattr(res, 'name', 'root'),
                    "folders": [f._raw if hasattr(f, '_raw') else f.__dict__ for f in (getattr(res, 'folders', []) or [])],
                    "files": [f._raw if hasattr(f, '_raw') else f.__dict__ for f in (getattr(res, 'files', []) or [])],
                    "torrents": [t._raw if hasattr(t, '_raw') else t.__dict__ for t in (getattr(res, 'torrents', []) or [])],
                    "space_used": getattr(res, 'space_used', 0),
                    "space_max": getattr(res, 'space_max', 0),
                }

            # Sort folders newest first, files alphabetically
            if "folders" in data and isinstance(data["folders"], list):
                data["folders"] = sorted(data["folders"], key=lambda x: x.get("last_update", ""), reverse=True)
            if "files" in data and isinstance(data["files"], list):
                data["files"] = sorted(data["files"], key=lambda x: x.get("name", ""))

            return data

        return self._execute(_call)

    def search_files(self, query: str) -> Dict[str, Any]:
        """
        Performs a global search across all files and folders in the Seedr account.
        """
        if not query:
            return {"folders": [], "files": [], "name": "Search Results"}

        def _call(client: Seedr):
            res = client.search_files(query=query)
            if hasattr(res, '_raw') and isinstance(res._raw, dict):
                return res._raw
            elif isinstance(res, dict):
                return res
            return {
                "id": getattr(res, 'id', None),
                "name": getattr(res, 'name', 'Search Results'),
                "folders": [f._raw if hasattr(f, '_raw') else f.__dict__ for f in (getattr(res, 'folders', []) or [])],
                "files": [f._raw if hasattr(f, '_raw') else f.__dict__ for f in (getattr(res, 'files', []) or [])],
            }

        return self._execute(_call)

    def fetch_file(self, file_id: Any) -> Dict[str, Any]:
        """
        Retrieves file metadata and the direct download / stream link for a given file ID.
        """
        f_id = str(file_id)

        def _call(client: Seedr):
            res = client.fetch_file(file_id=f_id)
            if hasattr(res, '_raw') and isinstance(res._raw, dict):
                return res._raw
            elif isinstance(res, dict):
                return res
            return {
                "result": getattr(res, 'result', True),
                "url": getattr(res, 'url', ''),
                "name": getattr(res, 'name', ''),
            }

        return self._execute(_call)

    def get_stream_url(self, file_id: Any) -> Dict[str, Any]:
        """
        Returns streaming details for a file, maintaining compatibility with existing player views.
        """
        return self.fetch_file(file_id)

    def create_archive(self, folder_id: Any) -> Dict[str, Any]:
        """
        Requests creation of a downloadable ZIP archive of a folder using Seedr download archive API.
        """
        import requests
        f_id = str(folder_id)

        # 1. Attempt via authenticated Seedr web session cookies
        if self.account and self.account.username and self.account.password:
            try:
                s = requests.Session()
                login_res = s.post(
                    'https://www.seedr.cc/auth/login',
                    data={'username': self.account.username, 'password': self.account.password},
                    timeout=15
                )
                if login_res.status_code == 200 and s.cookies:
                    res = s.post(
                        'https://www.seedr.cc/download/archive',
                        data={"archive_arr[0][type]": "folder", "archive_arr[0][id]": f_id},
                        timeout=20
                    )
                    if res.status_code == 200:
                        data = res.json()
                        archive_url = data.get('url') or data.get('archive_url')
                        if archive_url:
                            return {
                                "result": True,
                                "url": archive_url,
                                "archive_url": archive_url,
                                "code": 200,
                                "raw": data
                            }
            except Exception as e:
                logger.warning(f"Direct Seedr archive download request failed for folder {f_id}: {e}")

        # 2. Fallback via seedrcc client library
        def _call(client: Seedr):
            res = client.create_archive(folder_id=f_id)
            if hasattr(res, '_raw') and isinstance(res._raw, dict):
                return res._raw
            elif isinstance(res, dict):
                return res
            return {
                "result": getattr(res, 'result', True),
                "archive_id": getattr(res, 'archive_id', None),
                "archive_url": getattr(res, 'archive_url', None),
                "url": getattr(res, 'archive_url', None),
                "code": getattr(res, 'code', 200),
            }

        return self._execute(_call)

    # Backward-compatible alias
    get_folder_archive = create_archive

    def add_folder(self, name: str) -> Dict[str, Any]:
        """
        Creates a new subfolder in the Seedr account.
        """
        def _call(client: Seedr):
            res = client.add_folder(name=name)
            if hasattr(res, '_raw') and isinstance(res._raw, dict):
                return res._raw
            elif isinstance(res, dict):
                return res
            return {"result": getattr(res, 'result', True), "code": getattr(res, 'code', 200)}

        return self._execute(_call)

    def rename_file(self, file_id: Any, new_name: str) -> Dict[str, Any]:
        """
        Renames a file in Seedr.
        """
        f_id = str(file_id)

        def _call(client: Seedr):
            res = client.rename_file(file_id=f_id, rename_to=new_name)
            if hasattr(res, '_raw') and isinstance(res._raw, dict):
                return res._raw
            elif isinstance(res, dict):
                return res
            return {"result": getattr(res, 'result', True), "code": getattr(res, 'code', 200)}

        return self._execute(_call)

    def rename_folder(self, folder_id: Any, new_name: str) -> Dict[str, Any]:
        """
        Renames a folder in Seedr.
        """
        f_id = str(folder_id)

        def _call(client: Seedr):
            res = client.rename_folder(folder_id=f_id, rename_to=new_name)
            if hasattr(res, '_raw') and isinstance(res._raw, dict):
                return res._raw
            elif isinstance(res, dict):
                return res
            return {"result": getattr(res, 'result', True), "code": getattr(res, 'code', 200)}

        return self._execute(_call)

    def delete_file(self, file_id: Any) -> Dict[str, Any]:
        """
        Deletes a file from Seedr.
        """
        f_id = str(file_id)

        def _call(client: Seedr):
            res = client.delete_file(file_id=f_id)
            if hasattr(res, '_raw') and isinstance(res._raw, dict):
                return res._raw
            elif isinstance(res, dict):
                return res
            return {"result": getattr(res, 'result', True), "code": getattr(res, 'code', 200)}

        return self._execute(_call)

    def delete_folder(self, folder_id: Any) -> Dict[str, Any]:
        """
        Deletes a folder from Seedr.
        """
        f_id = str(folder_id)

        def _call(client: Seedr):
            res = client.delete_folder(folder_id=f_id)
            if hasattr(res, '_raw') and isinstance(res._raw, dict):
                return res._raw
            elif isinstance(res, dict):
                return res
            return {"result": getattr(res, 'result', True), "code": getattr(res, 'code', 200)}

        return self._execute(_call)

    # =========================================================================
    # Torrent Operations
    # =========================================================================

    def add_torrent(self, link: Optional[str] = None, torrent_file: Optional[str] = None, folder_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Adds a magnet link or torrent file to Seedr without invalid folder_id parameters.
        Gracefully catches 413 storage limits and returns user-friendly wishlist status.
        """
        def _call(client: Seedr):
            payload = {}
            if link:
                payload["torrent_magnet"] = link
            if folder_id and str(folder_id) not in ("-1", "0", "None"):
                payload["folder_id"] = str(folder_id)

            files = {}
            if torrent_file:
                files = client._read_torrent_file(torrent_file)

            try:
                res = client._api_request("post", "add_torrent", data=payload, files=files)
                if hasattr(res, '_raw') and isinstance(res._raw, dict):
                    return res._raw
                elif isinstance(res, dict):
                    return res
                return {
                    "result": getattr(res, 'result', True),
                    "user_torrent_id": getattr(res, 'user_torrent_id', None),
                    "title": getattr(res, 'title', ''),
                    "torrent_hash": getattr(res, 'torrent_hash', ''),
                    "code": getattr(res, 'code', 200),
                }
            except seedr_exc.APIError as api_err:
                if api_err.response and api_err.response.status_code == 413:
                    try:
                        err_json = api_err.response.json()
                        wt = err_json.get('wt', {})
                        return {
                            "result": False,
                            "wishlist": True,
                            "title": wt.get('title', 'Torrent'),
                            "size": wt.get('size'),
                            "message": "File exceeds available Seedr storage space. Added to Wishlist."
                        }
                    except Exception:
                        return {
                            "result": False,
                            "wishlist": True,
                            "message": "File exceeds available Seedr storage space. Added to Wishlist."
                        }
                raise

        return self._execute(_call)

    def delete_torrent(self, torrent_id: Any) -> Dict[str, Any]:
        """
        Deletes an active or completed torrent from Seedr.
        """
        t_id = str(torrent_id)

        def _call(client: Seedr):
            res = client.delete_torrent(torrent_id=t_id)
            if hasattr(res, '_raw') and isinstance(res._raw, dict):
                return res._raw
            elif isinstance(res, dict):
                return res
            return {"result": getattr(res, 'result', True), "code": getattr(res, 'code', 200)}

        return self._execute(_call)

    def delete_wishlist(self, wishlist_id: Any) -> Dict[str, Any]:
        """
        Deletes an item from the Seedr wishlist.
        """
        w_id = str(wishlist_id)

        def _call(client: Seedr):
            res = client.delete_wishlist(wishlist_id=w_id)
            if hasattr(res, '_raw') and isinstance(res._raw, dict):
                return res._raw
            elif isinstance(res, dict):
                return res
            return {"result": getattr(res, 'result', True), "code": getattr(res, 'code', 200)}

        return self._execute(_call)

    def get_torrent_progress(self, progress_url: str) -> Dict[str, Any]:
        """
        Fetches live download progress for an active torrent.
        """
        def _call(client: Seedr):
            res = client.get_torrent_progress(progress_url=progress_url)
            if hasattr(res, '_raw') and isinstance(res._raw, dict):
                return res._raw
            elif isinstance(res, dict):
                return res
            return {
                "title": getattr(res, 'title', ''),
                "size": getattr(res, 'size', 0),
                "progress": getattr(res, 'progress', 0),
                "hash": getattr(res, 'hash', ''),
                "stopped": getattr(res, 'stopped', False),
                "download_rate": getattr(res, 'download_rate', 0),
                "warnings": getattr(res, 'warnings', None),
            }

        return self._execute(_call)

    def scan_page(self, url: str) -> Dict[str, Any]:
        """
        Scans a webpage URL for magnet links and torrent files using seedrcc.
        """
        def _call(client: Seedr):
            res = client.scan_page(url=url)
            if hasattr(res, '_raw') and isinstance(res._raw, dict):
                return res._raw
            elif isinstance(res, dict):
                return res
            return {
                "title": getattr(res, 'title', ''),
                "torrents": [t._raw if hasattr(t, '_raw') else t.__dict__ for t in (getattr(res, 'torrents', []) or [])],
            }

        return self._execute(_call)

    # =========================================================================
    # Account & Health Operations
    # =========================================================================

    def get_settings(self) -> Dict[str, Any]:
        """
        Retrieves user settings, account details, and updates model cached metadata.
        """
        def _call(client: Seedr):
            settings_res = client.get_settings()
            account_info = getattr(settings_res, 'account', None)

            # Update safe cached metadata on SeedrAccount model
            if account_info and hasattr(account_info, 'user_id'):
                try:
                    self.account.seedr_user_id = str(account_info.user_id)
                    self.account.seedr_username = str(account_info.username) if getattr(account_info, 'username', None) else None
                    self.account.premium = bool(getattr(account_info, 'premium', False))
                    self.account.package_name = str(account_info.package_name) if getattr(account_info, 'package_name', None) else None
                    self.account.space_used = int(account_info.space_used) if getattr(account_info, 'space_used', None) is not None else None
                    self.account.space_max = int(account_info.space_max) if getattr(account_info, 'space_max', None) is not None else None
                    self.account.bandwidth_used = int(account_info.bandwidth_used) if getattr(account_info, 'bandwidth_used', None) is not None else None
                    self.account.save(update_fields=[
                        'seedr_user_id',
                        'seedr_username',
                        'premium',
                        'package_name',
                        'space_used',
                        'space_max',
                        'bandwidth_used',
                        'updated_at'
                    ])
                except Exception as e:
                    logger.debug(f"Failed to update model settings cache: {e}")

            if hasattr(settings_res, '_raw') and isinstance(settings_res._raw, dict):
                return settings_res._raw
            elif isinstance(settings_res, dict):
                return settings_res

            return {
                "result": getattr(settings_res, 'result', True),
                "settings": settings_res.settings._raw if hasattr(getattr(settings_res, 'settings', None), '_raw') else {},
                "account": account_info._raw if hasattr(account_info, '_raw') else (account_info if isinstance(account_info, dict) else {}),
                "country": getattr(settings_res, 'country', ''),
            }

        return self._execute(_call)

    def get_memory_bandwidth(self) -> Dict[str, Any]:
        """
        Fetches bandwidth and storage usage statistics.
        """
        def _call(client: Seedr):
            res = client.get_memory_bandwidth()
            if hasattr(res, '_raw') and isinstance(res._raw, dict):
                return res._raw
            elif isinstance(res, dict):
                return res
            return {
                "space_used": getattr(res, 'space_used', 0),
                "space_max": getattr(res, 'space_max', 0),
                "bandwidth_used": getattr(res, 'bandwidth_used', 0),
                "bandwidth_max": getattr(res, 'bandwidth_max', 0),
                "is_premium": getattr(res, 'is_premium', False),
            }

        return self._execute(_call)

    def get_devices(self) -> List[Dict[str, Any]]:
        """
        Lists authorized devices for this Seedr account, sanitizing private tokens.
        """
        def _call(client: Seedr):
            devices = client.get_devices()
            safe_devices = []
            for d in (devices or []):
                safe_devices.append({
                    "client_id": getattr(d, 'client_id', None) or (d.get('client_id') if isinstance(d, dict) else None),
                    "client_name": getattr(d, 'client_name', None) or (d.get('client_name') if isinstance(d, dict) else None),
                    "device_code": getattr(d, 'device_code', None) or (d.get('device_code') if isinstance(d, dict) else None),
                })
            return safe_devices

        return self._execute(_call)

    def test_connection(self, expected_user_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Executes a comprehensive health and identity verification test for this SeedrAccount.
        1. Authenticates/restores client.
        2. Queries get_settings().
        3. Validates account identity against expected_user_id (if configured).
        4. Updates last_connection_test timestamp and cached usage metrics.
        5. Returns a structured, credential-sanitized status response.
        """
        try:
            expected = expected_user_id or self.account.seedr_user_id

            settings_data = self.get_settings()
            acc_info = settings_data.get('account', {}) if isinstance(settings_data, dict) else {}

            user_id = str(acc_info.get('user_id', ''))
            username = acc_info.get('username') or self.account.username

            # Verify identity if expected ID is specified
            if expected and str(expected) != user_id:
                mismatch_err = f"Account identity mismatch: Expected user ID '{expected}', but authenticated as '{user_id}'."
                logger.error(f"Seedr connection test failed for '{self.account.name}': {mismatch_err}")
                self._record_account_error(mismatch_err, "IdentityMismatchError", status='AUTH_ERROR')
                return {
                    "success": False,
                    "status": "identity_mismatch",
                    "error": mismatch_err,
                    "account_name": self.account.name,
                }

            now = timezone.now()
            self.account.last_connection_test = now
            self.account.status = 'ACTIVE'
            self.account.last_error = None
            self.account.last_error_type = None
            self.account.save(update_fields=[
                'last_connection_test',
                'status',
                'last_error',
                'last_error_type',
                'updated_at'
            ])

            return {
                "success": True,
                "status": "connected",
                "message": f"Successfully connected to Seedr account '{self.account.name}'.",
                "account_name": self.account.name,
                "username": username,
                "seedr_user_id": user_id,
                "premium": bool(acc_info.get('premium', False)),
                "package_name": acc_info.get('package_name', ''),
                "space_used": acc_info.get('space_used', 0),
                "space_max": acc_info.get('space_max', 0),
                "bandwidth_used": acc_info.get('bandwidth_used', 0),
                "last_authenticated": self.account.last_authenticated.isoformat() if self.account.last_authenticated else None,
            }
        except SeedrAuthError as e:
            return {
                "success": False,
                "status": "auth_error",
                "error": str(e),
                "account_name": self.account.name,
            }
        except SeedrNetworkError as e:
            return {
                "success": False,
                "status": "network_error",
                "error": str(e),
                "account_name": self.account.name,
            }
        except Exception as e:
            return {
                "success": False,
                "status": "error",
                "error": str(e),
                "account_name": self.account.name,
            }


def get_default_seedr_account() -> Optional[SeedrAccount]:
    """
    Returns the configured default SeedrAccount, falling back to any ACTIVE account.
    """
    account = SeedrAccount.objects.filter(is_default=True).first()
    if not account:
        account = SeedrAccount.objects.filter(status='ACTIVE').first()
    return account


def get_seedr_service_for_user(user) -> SeedrService:
    """
    Returns an initialized SeedrService instance for the user's assigned SeedrAccount.
    If no Seedr account is assigned to the user's profile, falls back to default Seedr account for superusers/TV clients, or raises SeedrAuthError with NO_SEEDR_ACCOUNT code.
    """
    profile = getattr(user, 'userprofile', None)
    account = profile.seedr_account if profile else None

    # Fallback to default Seedr account for superuser or TV client
    if not account and (getattr(user, 'is_superuser', False) or getattr(user, '_is_tv_client', False)):
        account = get_default_seedr_account()

    if not account:
        raise SeedrAuthError(
            message="No Seedr account is assigned to your profile. Please contact an administrator to link a Seedr account.",
            code="NO_SEEDR_ACCOUNT"
        )

    return SeedrService(account)


def get_seedr_service_for_account(account: SeedrAccount) -> SeedrService:
    """
    Returns an initialized SeedrService instance for a given SeedrAccount model instance.
    """
    if not account:
        raise SeedrAuthError("Invalid Seedr account specified.")
    return SeedrService(account)
