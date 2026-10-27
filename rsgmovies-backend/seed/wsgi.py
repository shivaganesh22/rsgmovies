"""
WSGI config for seed project with WhiteNoise static asset serving.
"""

import os
from django.core.wsgi import get_wsgi_application
from whitenoise import WhiteNoise
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'seed.settings')

application = get_wsgi_application()

# Wrap application with WhiteNoise to ensure static files are served seamlessly in serverless / production
if hasattr(settings, 'STATIC_ROOT') and os.path.exists(settings.STATIC_ROOT):
    application = WhiteNoise(application, root=settings.STATIC_ROOT, prefix='/static/')

app = application
