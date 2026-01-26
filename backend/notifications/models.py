from django.db import models
from django.utils import timezone
import uuid

class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ('event_approval', 'Event Approval'),
        ('event_registration', 'Event Registration'),
        ('event_update', 'Event Update'),
        ('event_reminder', 'Event Reminder'),
        ('club_invitation', 'Club Invitation'),
        ('club_approval', 'Club Approval'),
        ('resource_booking', 'Resource Booking'),
        ('booking_approval', 'Booking Approval'),
        ('booking_reminder', 'Booking Reminder'),
        ('message', 'New Message'),
        ('announcement', 'Announcement'),
        ('system', 'System Notification'),
        ('other', 'Other'),
    )
    
    PRIORITY_LEVELS = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    priority = models.CharField(max_length=20, choices=PRIORITY_LEVELS, default='medium')
    
    # Notification content
    title = models.CharField(max_length=200)
    message = models.TextField()
    data = models.JSONField(default=dict)  # Additional data for the notification
    
    # Related entities (optional)
    event = models.ForeignKey('events.Event', on_delete=models.SET_NULL, null=True, blank=True)
    club = models.ForeignKey('clubs.Club', on_delete=models.SET_NULL, null=True, blank=True)
    resource_booking = models.ForeignKey('resources.ResourceBooking', on_delete=models.SET_NULL, null=True, blank=True)
    message_thread = models.ForeignKey('messaging.MessageThread', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Status tracking
    is_read = models.BooleanField(default=False)
    is_sent = models.BooleanField(default=False)
    sent_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Expiry
    expires_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        indexes = [
            models.Index(fields=['recipient', 'is_read', 'created_at']),
            models.Index(fields=['notification_type']),
            models.Index(fields=['priority']),
            models.Index(fields=['expires_at']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.recipient.email}"
    
    @property
    def is_expired(self):
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False
    
    @property
    def should_send(self):
        return not self.is_sent and not self.is_expired

class NotificationPreference(models.Model):
    CHANNEL_CHOICES = (
        ('email', 'Email'),
        ('push', 'Push Notification'),
        ('in_app', 'In-App Notification'),
        ('sms', 'SMS'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='notification_preferences')
    notification_type = models.CharField(max_length=50, choices=Notification.NOTIFICATION_TYPES)
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES)
    is_enabled = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ['user', 'notification_type', 'channel']
    
    def __str__(self):
        return f"{self.user.email} - {self.notification_type} via {self.channel}"