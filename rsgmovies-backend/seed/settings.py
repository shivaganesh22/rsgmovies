"""
Django settings for RSG Movies backend project.
Modernized for production with Microsoft Entra ID (OIDC),
Django session authentication, and Seedr service integration.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import dj_database_url
# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env if present
load_dotenv(os.path.join(BASE_DIR, '.env'))

# Security settings
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-dev-key-change-in-production-1234567890')
DEBUG = os.getenv('DEBUG', 'False').lower() in ('true', '1', 't')

allowed_hosts_env = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1,testserver')
ALLOWED_HOSTS = [host.strip() for host in allowed_hosts_env.split(',') if host.strip()]

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party packages
    'rest_framework',
    'corsheaders',
    'mozilla_django_oidc',
    'drf_spectacular',
    'auditlog',

    # Internal applications
    'core',
    'seedr_service',
    'accounts',
    'activity',
    'admin_control',
    'react',
    'tv',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'core.middleware.RequestIDMiddleware',  # Correlation / Request ID tracking
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'core.middleware.TVDeviceSessionMiddleware',      # Authenticates and validates TV device sessions
    'core.middleware.SingleActiveSessionMiddleware',  # Enforces one active session per user
    'core.middleware.ReactSessionAuthMiddleware',     # Protects all React & admin routes
    'core.middleware.MaintenanceModeMiddleware',     # Server-enforced maintenance mode
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'auditlog.middleware.AuditlogMiddleware',
]

ROOT_URLCONF = 'seed.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'seed.wsgi.application'

# Database Configuration (Neon PostgreSQL with connection pooling)
DATABASE_URL = os.getenv('DATABASE_URL', '')
if 'test' in sys.argv:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': ':memory:',
        }
    }
else:
    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
            ssl_require=True,
        )
    }

# Seedr Encryption Key
SEEDR_ENCRYPTION_KEY = os.getenv('SEEDR_ENCRYPTION_KEY', '')

# Authentication Backends
AUTHENTICATION_BACKENDS = [
    'accounts.auth_backend.EntraOIDCAuthenticationBackend',
    'django.contrib.auth.backends.ModelBackend',
]

# Microsoft Entra ID OpenID Connect Configuration
OIDC_RP_CLIENT_ID = os.getenv('ENTRA_CLIENT_ID', 'placeholder-entra-client-id')
OIDC_RP_CLIENT_SECRET = os.getenv('ENTRA_CLIENT_SECRET', 'placeholder-entra-client-secret')
OIDC_TENANT_ID = os.getenv('ENTRA_TENANT_ID', 'common')
OIDC_OP_AUTHORIZATION_ENDPOINT = os.getenv(
    'OIDC_OP_AUTHORIZATION_ENDPOINT',
    f"https://login.microsoftonline.com/{OIDC_TENANT_ID}/oauth2/v2.0/authorize"
)
OIDC_OP_TOKEN_ENDPOINT = os.getenv(
    'OIDC_OP_TOKEN_ENDPOINT',
    f"https://login.microsoftonline.com/{OIDC_TENANT_ID}/oauth2/v2.0/token"
)
OIDC_OP_USER_ENDPOINT = os.getenv(
    'OIDC_OP_USER_ENDPOINT',
    "https://graph.microsoft.com/oidc/userinfo"
)
OIDC_OP_JWKS_ENDPOINT = os.getenv(
    'OIDC_OP_JWKS_ENDPOINT',
    f"https://login.microsoftonline.com/{OIDC_TENANT_ID}/discovery/v2.0/keys"
)
OIDC_RP_SIGN_ALGO = os.getenv('OIDC_RP_SIGN_ALGO', 'RS256')
OIDC_RP_SCOPES = os.getenv('OIDC_RP_SCOPES', 'openid profile email')
OIDC_AUTHENTICATION_CALLBACK_URL = 'oidc_authentication_callback'
LOGIN_REDIRECT_URL = os.getenv('LOGIN_REDIRECT_URL', 'https://rsgmovies.vercel.app/')
LOGOUT_REDIRECT_URL = os.getenv('LOGOUT_REDIRECT_URL', 'https://rsgmovies.vercel.app/login')

# Proxy SSL & Header Forwarding (Essential for Vercel / Cloud Reverse Proxies)
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True

# Django Session & Cookie Security (Configured strictly from .env, defaults to Lax for same-origin proxy)
SESSION_ENGINE = 'django.contrib.sessions.backends.db'
SESSION_COOKIE_AGE = int(os.getenv('SESSION_COOKIE_AGE', '3600'))  # 1 hour
SESSION_EXPIRE_AT_BROWSER_CLOSE = False
SESSION_SAVE_EVERY_REQUEST = True
SESSION_COOKIE_HTTPONLY = True

SESSION_COOKIE_SAMESITE = os.getenv('SESSION_COOKIE_SAMESITE', 'Lax')
SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'False' if DEBUG else 'True').lower() in ('true', '1')

CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = os.getenv('CSRF_COOKIE_SAMESITE', 'Lax')
CSRF_COOKIE_SECURE = os.getenv('CSRF_COOKIE_SECURE', 'False' if DEBUG else 'True').lower() in ('true', '1')

# CORS & CSRF Configuration (Strictly from .env - No fallback wildcards)
CORS_ALLOW_CREDENTIALS = True
cors_origins_env = os.getenv('CORS_ALLOWED_ORIGINS', '')
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in cors_origins_env.split(',') if origin.strip()]

csrf_trusted_env = os.getenv('CSRF_TRUSTED_ORIGINS', '')
CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in csrf_trusted_env.split(',') if origin.strip()]
if not CSRF_TRUSTED_ORIGINS and CORS_ALLOWED_ORIGINS:
    CSRF_TRUSTED_ORIGINS = list(CORS_ALLOWED_ORIGINS)

CORS_ORIGIN_ALLOW_ALL = False

# Django REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'tv.auth_backend.TVDeviceSessionAuthentication',
        'accounts.auth_backend.AndroidTVTokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'accounts.permissions.IsAuthenticated',
    ],
    'EXCEPTION_HANDLER': 'core.exceptions.custom_exception_handler',
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': os.getenv('THROTTLE_RATE_ANON', '120/minute'),
        'user': os.getenv('THROTTLE_RATE_USER', '1200/minute'),
    }
}

# OpenAPI Documentation (drf-spectacular)
SPECTACULAR_SETTINGS = {
    'TITLE': 'RSG Movies Backend API',
    'DESCRIPTION': 'Production API documentation for RSG Movies backend with Entra ID OIDC authentication and Seedr integration.',
    'VERSION': '2.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
}

# Seedr App Configuration
SEEDR_ENCRYPTION_KEY = os.getenv('SEEDR_ENCRYPTION_KEY')

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

# Static & Media Files (WhiteNoise compressed static asset serving)
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
]

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
    },
}

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Structured Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'structured': {
            'format': '[%(asctime)s] %(levelname)s in %(name)s (req_id=%(request_id)s): %(message)s',
            'defaults': {'request_id': '-'}
        },
        'simple': {
            'format': '[%(asctime)s] %(levelname)s %(name)s: %(message)s'
        }
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': os.getenv('LOG_LEVEL', 'INFO'),
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.server': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'react': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'admin_control': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'seedr_service': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'accounts': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'core': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    }
}
