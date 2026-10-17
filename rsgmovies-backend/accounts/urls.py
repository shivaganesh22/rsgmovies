from django.urls import path
from accounts.views import (
    EntraOIDCInitView,
    EntraOIDCCallbackView,
    SessionMeView,
    SessionLogoutView,
    CsrfTokenView,
)

urlpatterns = [
    path('login/', EntraOIDCInitView.as_view(), name='oidc_authentication_init'),
    path('callback/', EntraOIDCCallbackView.as_view(), name='oidc_authentication_callback'),
    path('me/', SessionMeView.as_view(), name='auth-me'),
    path('logout/', SessionLogoutView.as_view(), name='auth-logout'),
    path('csrf/', CsrfTokenView.as_view(), name='auth-csrf'),
]
