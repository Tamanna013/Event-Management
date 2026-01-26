from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClubViewSet, ClubInvitationViewSet

router = DefaultRouter()
router.register(r'', ClubViewSet, basename='clubs')
router.register(r'invitations', ClubInvitationViewSet, basename='invitations')

urlpatterns = [
    path('', include(router.urls)),
]