import base64
import hashlib
import os
from django.conf import settings
from cryptography.fernet import Fernet


def _derive_fernet_key(key_material: str) -> bytes:
    """Derive a valid 32-byte URL-safe base64 key from any string or secret."""
    if not key_material:
        return b""
    try:
        raw = base64.urlsafe_b64decode(key_material.encode('utf-8'))
        if len(raw) == 32:
            return key_material.encode('utf-8')
    except Exception:
        pass
    derived = hashlib.sha256(key_material.encode('utf-8')).digest()
    return base64.urlsafe_b64encode(derived)


def _get_candidate_keys():
    """Returns candidate Fernet keys for encryption & decryption across localhost and production."""
    candidates = []

    # 1. Dedicated Seedr encryption key from environment / settings
    custom_key = getattr(settings, 'SEEDR_ENCRYPTION_KEY', None) or os.getenv('SEEDR_ENCRYPTION_KEY')
    if custom_key:
        candidates.append(_derive_fernet_key(custom_key))

    # 2. Key derived from SECRET_KEY
    if getattr(settings, 'SECRET_KEY', None):
        secret = settings.SECRET_KEY
        # Seedr salt derivation
        salt_derived = hashlib.sha256(b"seedr_fernet_salt:" + secret.encode('utf-8')).digest()
        candidates.append(base64.urlsafe_b64encode(salt_derived))
        candidates.append(_derive_fernet_key(secret))

    # Deduplicate while preserving order
    seen = set()
    result = []
    for k in candidates:
        if k and k not in seen:
            seen.add(k)
            result.append(k)
    return result


def _get_fernet_key() -> bytes:
    """Primary encryption key."""
    keys = _get_candidate_keys()
    return keys[0] if keys else base64.urlsafe_b64encode(b"0" * 32)


def encrypt_value(plain_text: str) -> str:
    """
    Encrypts a plaintext string using Fernet AES-128-CBC.
    Returns URL-safe base64 ciphertext string.
    """
    if not plain_text:
        return ""
    key = _get_fernet_key()
    fernet = Fernet(key)
    encrypted_bytes = fernet.encrypt(plain_text.encode('utf-8'))
    return encrypted_bytes.decode('utf-8')


def decrypt_value(cipher_text: str) -> str:
    """
    Decrypts a ciphertext string using candidate keys across environments (localhost/prod).
    If ciphertext is unencrypted plaintext, returns it as-is.
    """
    if not cipher_text:
        return ""

    candidate_keys = _get_candidate_keys()
    for key in candidate_keys:
        try:
            fernet = Fernet(key)
            decrypted_bytes = fernet.decrypt(cipher_text.encode('utf-8'))
            return decrypted_bytes.decode('utf-8')
        except Exception:
            continue

    # Fallback: if value was stored in plaintext or cannot be decrypted
    return cipher_text
