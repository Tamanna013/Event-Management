from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClubViewSet, ClubInvitationViewSet

router = DefaultRouter()
router.register(r'', ClubViewSet, basename='club')
router.register(r'invitations', ClubInvitationViewSet, basename='invitation')

urlpatterns = [
    path('', include(router.urls)),
]