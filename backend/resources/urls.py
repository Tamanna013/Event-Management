from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ResourceCategoryViewSet, ResourceViewSet, ResourceBookingViewSet

router = DefaultRouter()
router.register(r'categories', ResourceCategoryViewSet, basename='resource-categories')
router.register(r'', ResourceViewSet, basename='resources')
router.register(r'bookings', ResourceBookingViewSet, basename='resource-bookings')

urlpatterns = [
    path('', include(router.urls)),
]