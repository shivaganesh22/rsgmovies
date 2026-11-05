from django.urls import path
from react import moviebox

urlpatterns = [
    path('moviebox/home/', moviebox.moviebox_home, name='moviebox-home'),
    path('moviebox/search/', moviebox.moviebox_search, name='moviebox-search'),
    path('moviebox/detail/<str:subject_id>/', moviebox.moviebox_details, name='moviebox-details'),
    path('moviebox/episode/<str:subject_id>/', moviebox.moviebox_episodes, name='moviebox-episodes'),
    path('moviebox/streams/<str:subject_id>/<int:season>/<int:episode>/', moviebox.moviebox_streams, name='moviebox-streams'),
    path('moviebox/captions/<str:subject_id>/<int:season>/<int:episode>/', moviebox.get_captions, name='moviebox-captions'),
]
