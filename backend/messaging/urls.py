from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MessageThreadViewSet, MessageViewSet

thread_router = DefaultRouter()
thread_router.register(r'', MessageThreadViewSet, basename='message-threads')

urlpatterns = [
    path('threads/', include(thread_router.urls)),
    path('threads/<uuid:thread_id>/messages/', MessageViewSet.as_view({
        'get': 'list',
        'post': 'create'
    }), name='thread-messages'),
    path('messages/<uuid:pk>/react/', MessageViewSet.as_view({
        'post': 'react'
    }), name='message-react'),
]