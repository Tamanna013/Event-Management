from rest_framework import serializers
from .models import Notification, NotificationPreference

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'priority', 'title', 'message',
            'data', 'event', 'club', 'resource_booking', 'message_thread',
            'is_read', 'is_sent', 'sent_at', 'read_at', 'expires_at',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = ['id', 'notification_type', 'channel', 'is_enabled']
        read_only_fields = ['id']