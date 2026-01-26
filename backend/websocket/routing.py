from django.urls import path
from .consumers import NotificationConsumer, MessageConsumer

websocket_urlpatterns = [
    path('ws/notifications/', NotificationConsumer.as_asgi()),
    path('ws/messages/', MessageConsumer.as_asgi()),
]