import logging
from django.contrib.auth import get_user_model
from django.utils import timezone
from mozilla_django_oidc.auth import OIDCAuthenticationBackend
from accounts.models import UserProfile
from seedr_service.services import get_default_seedr_account
from activity.services import log_security_event

logger = logging.getLogger(__name__)
User = get_user_model()


class EntraOIDCAuthenticationBackend(OIDCAuthenticationBackend):
    """
    Custom OpenID Connect authentication backend for Microsoft Entra ID.
    Handles user reconciliation, UPN mapping, profile synchronization,
    role extraction, and default Seedr account assignment.
    """

    def get_userinfo(self, access_token, id_token, payload):
        """
        Microsoft Entra ID returns the primary identity claims (preferred_username, oid,
        email, roles, upn) inside the verified ID token (payload).
        The Microsoft Graph userinfo endpoint (https://graph.microsoft.com/oidc/userinfo)
        returns only a minimal pairwise 'sub' and 'name'.

        We merge the userinfo endpoint response with the verified ID token payload so that
        preferred_username (UPN), oid (Entra Object ID), roles, and email are preserved.
        """
        user_info = {}
        try:
            user_info = super().get_userinfo(access_token, id_token, payload)
        except Exception as e:
            logger.warning(f"Could not retrieve claims from userinfo endpoint, relying on ID token payload: {e}")

        # Merged claims: verified ID token claims take precedence for identity fields
        merged_claims = {}
        if isinstance(user_info, dict):
            merged_claims.update(user_info)
        if isinstance(payload, dict):
            merged_claims.update(payload)

        logger.info(f"OIDC Merged Claims keys: {list(merged_claims.keys())}")
        return merged_claims

    def _extract_upn(self, claims: dict) -> str:
        """
        Extract the User Principal Name from Entra ID claims.
        Looks for preferred_username, upn, unique_name, or email.
        Avoids pairwise 'sub' hash when actual username/email is available.
        """
        upn = (
            claims.get('preferred_username') or
            claims.get('upn') or
            claims.get('unique_name') or
            claims.get('email') or
            claims.get('mail') or
            claims.get('http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn') or
            claims.get('http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name')
        )
        if not upn:
            # Fallback to sub only if nothing else exists
            upn = claims.get('sub')
        if not upn:
            raise ValueError("No valid UPN or identity claim found in Entra ID token.")
        return str(upn).strip().lower()

    def _extract_display_name(self, claims: dict, fallback_upn: str) -> str:
        name = (
            claims.get('name') or
            claims.get('http://schemas.microsoft.com/identity/claims/displayname')
        )
        if not name:
            first = claims.get('given_name', '')
            last = claims.get('family_name', '')
            name = f"{first} {last}".strip()
        return name if name else fallback_upn

    def _extract_email(self, claims: dict, fallback_upn: str) -> str:
        email = claims.get('email') or claims.get('mail')
        if not email and '@' in fallback_upn:
            email = fallback_upn
        return email or fallback_upn

    def _extract_object_id(self, claims: dict) -> str:
        """
        Extract the Microsoft Entra Object ID (oid claim).
        """
        oid = (
            claims.get('oid') or
            claims.get('http://schemas.microsoft.com/identity/claims/objectidentifier')
        )
        if oid:
            return str(oid).strip()
        return None

    def _extract_role(self, claims: dict) -> str:
        roles = claims.get('roles', [])
        if isinstance(roles, str):
            roles = [roles]
        if 'Admin' in roles or 'admin' in roles:
            return 'Admin'
        return 'User'

    def filter_users_by_claims(self, claims: dict):
        """
        Look up user by Entra Object ID (persistent) first, then by UPN.
        """
        try:
            oid = self._extract_object_id(claims)
            upn = self._extract_upn(claims)

            # 1. Match by Entra Object ID if present (persistent across UPN renames)
            if oid:
                profile_by_oid = UserProfile.objects.filter(entra_object_id=oid).select_related('user').first()
                if profile_by_oid and profile_by_oid.user:
                    return [profile_by_oid.user]

            # 2. Match by UPN on UserProfile
            profile = UserProfile.objects.filter(upn__iexact=upn).select_related('user').first()
            if profile and profile.user:
                return [profile.user]

            # 3. Fallback check on User.username or User.email
            user = User.objects.filter(username__iexact=upn).first()
            if not user and '@' in upn:
                user = User.objects.filter(email__iexact=upn).first()

            if user:
                return [user]
            return self.UserModel.objects.none()
        except Exception as e:
            logger.error(f"Error filtering users by OIDC claims: {e}")
            return self.UserModel.objects.none()

    def verify_claims(self, claims: dict) -> bool:
        """
        Verify that necessary identity claims are present.
        """
        try:
            upn = self._extract_upn(claims)
            return bool(upn)
        except ValueError:
            return False

    def create_user(self, claims: dict):
        """
        Creates a new User and associated UserProfile after successful Entra ID verification.
        """
        upn = self._extract_upn(claims)
        display_name = self._extract_display_name(claims, upn)
        email = self._extract_email(claims, upn)
        role = self._extract_role(claims)
        entra_object_id = self._extract_object_id(claims) or claims.get('sub')

        logger.info(f"Creating new RSG user profile for UPN: {upn} with role: {role}, object_id: {entra_object_id}")

        # Create Django User
        user = User.objects.create(
            username=upn,
            email=email,
            first_name=display_name.split()[0] if display_name else "",
            last_name=" ".join(display_name.split()[1:]) if len(display_name.split()) > 1 else "",
            is_active=True,
            is_staff=(role == 'Admin'),
            is_superuser=(role == 'Admin')
        )
        user.set_unusable_password()
        user.save()

        # Assign default Seedr account
        default_seedr = get_default_seedr_account()

        # Create UserProfile
        profile = UserProfile.objects.create(
            user=user,
            upn=upn,
            display_name=display_name,
            email=email,
            entra_object_id=entra_object_id,
            role=role,
            seedr_account=default_seedr,
            is_active=True,
            last_login=timezone.now()
        )
        user.userprofile = profile

        return user

    def update_user(self, user, claims: dict):
        """
        Updates an existing User and UserProfile with updated claims from Entra ID.
        Entra ID is authoritative for Roles, Names, and Object IDs.
        """
        upn = self._extract_upn(claims)
        display_name = self._extract_display_name(claims, upn)
        email = self._extract_email(claims, upn)
        role = self._extract_role(claims)
        entra_object_id = self._extract_object_id(claims)

        profile, created = UserProfile.objects.get_or_create(
            user=user,
            defaults={
                'upn': upn,
                'display_name': display_name,
                'email': email,
                'entra_object_id': entra_object_id,
                'role': role,
                'seedr_account': get_default_seedr_account(),
                'is_active': True,
            }
        )

        if not created:
            profile.upn = upn
            profile.display_name = display_name
            profile.email = email
            if entra_object_id:
                profile.entra_object_id = entra_object_id

            # Entra ID is authoritative for role: sync UserProfile and Django staff/superuser
            profile.role = role
            user.is_staff = (role == 'Admin')
            user.is_superuser = (role == 'Admin')

            profile.last_login = timezone.now()
            profile.save()

        user.userprofile = profile
        user.username = upn
        user.email = email
        user.save(update_fields=['username', 'email', 'is_staff', 'is_superuser'])
        return user


from rest_framework.authentication import BaseAuthentication, get_authorization_header

class AndroidTVTokenAuthentication(BaseAuthentication):
    """
    Dedicated authentication scheme strictly for the legacy Android TV App.
    Authenticates requests via 'Authorization: Token <key>' header against the UserToken table.
    NEVER falls back to default/superuser accounts. If token is invalid or missing, returns None (401).
    """
    def authenticate(self, request):
        auth_header = get_authorization_header(request).decode('utf-8').strip()
        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'token':
            return None

        key = parts[1].strip()

        # Validate against UserToken table
        try:
            from react.models import UserToken
            token_obj = UserToken.objects.select_related('user').filter(key=key, is_active=True).first()
            if token_obj and token_obj.user and token_obj.user.is_active:
                token_obj.last_used = timezone.now()
                token_obj.save(update_fields=['last_used'])
                token_obj.user._is_tv_client = True
                return (token_obj.user, None)
        except Exception as e:
            logger.warning(f"Error validating TV token: {e}")

        # Invalid token -> returns None (triggers 401 Unauthorized, never dangerous fallback)
        return None

    def authenticate_header(self, request):
        return 'Token'


