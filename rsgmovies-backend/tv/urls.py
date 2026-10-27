from django.urls import path
from tv.views import (
    TVQRInitView,
    TVQRPollView,
    TVAuthRequestDetailView,
    TVQRApproveView,
    TVSessionValidateView,
    TVSessionLogoutView,
    TVConfigView,
)

urlpatterns = [
    # QR Code Authentication Flow
    path('auth/qr/init/', TVQRInitView.as_view(), name='tv-qr-init'),
    path('auth/qr/poll/', TVQRPollView.as_view(), name='tv-qr-poll'),
    path('auth/qr/details/', TVAuthRequestDetailView.as_view(), name='tv-qr-details'),
    path('auth/qr/approve/', TVQRApproveView.as_view(), name='tv-qr-approve'),

    # Session & Device Validation
    path('session/validate/', TVSessionValidateView.as_view(), name='tv-session-validate'),
    path('session/logout/', TVSessionLogoutView.as_view(), name='tv-session-logout'),

    # Remote Configuration & App Updates
    path('config/', TVConfigView.as_view(), name='tv-config'),
]
