from django.db import models
from django.utils import timezone
import uuid

class MessageThread(models.Model):
    THREAD_TYPES = (
        ('direct', 'Direct Message'),
        ('group', 'Group Chat'),
        ('event', 'Event Discussion'),
        ('club', 'Club Discussion'),
        ('project', 'Project Team'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    thread_type = models.CharField(max_length=50, choices=THREAD_TYPES, default='direct')
    name = models.CharField(max_length=200, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    
    # Related entities (optional)
    event = models.ForeignKey('events.Event', on_delete=models.CASCADE, null=True, blank=True, related_name='message_threads')
    club = models.ForeignKey('clubs.Club', on_delete=models.CASCADE, null=True, blank=True, related_name='message_threads')
    
    # Participants
    participants = models.ManyToManyField('users.User', related_name='message_threads')
    
    # Metadata
    created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, related_name='created_threads')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['thread_type']),
            models.Index(fields=['updated_at']),
        ]
        ordering = ['-updated_at']
    
    def __str__(self):
        if self.name:
            return self.name
        elif self.event:
            return f"Event: {self.event.title}"
        elif self.club:
            return f"Club: {self.club.name}"
        else:
            participants = self.participants.all()[:3]
            names = [p.get_full_name() or p.email for p in participants]
            return f"Chat with {', '.join(names)}"
    
    @property
    def last_message(self):
        return self.messages.filter(is_deleted=False).order_by('-created_at').first()
    
    @property
    def unread_count(self, user):
        return self.messages.filter(is_read=False).exclude(sender=user).count()

class Message(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    thread = models.ForeignKey(MessageThread, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='sent_messages')
    
    # Message content
    content = models.TextField()
    message_type = models.CharField(max_length=50, default='text')  # text, image, file, system
    attachments = models.JSONField(default=list)  # List of attachment URLs
    
    # Status tracking
    is_read = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    read_by = models.ManyToManyField('users.User', through='MessageReadReceipt', related_name='read_messages')
    
    # Metadata
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['thread', 'created_at']),
            models.Index(fields=['sender']),
            models.Index(fields=['is_read']),
        ]
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.sender.email}: {self.content[:50]}..."
    
    def mark_as_read(self, user):
        """Mark message as read by a user"""
        if not self.is_read and user != self.sender:
            self.is_read = True
            self.save()
            MessageReadReceipt.objects.get_or_create(message=self, user=user)

class MessageReadReceipt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(Message, on_delete=models.CASCADE)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE)
    read_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        unique_together = ['message', 'user']
    
    def __str__(self):
        return f"{self.user.email} read message at {self.read_at}"

class MessageReaction(models.Model):
    REACTION_TYPES = (
        ('like', '👍'),
        ('love', '❤️'),
        ('laugh', '😄'),
        ('wow', '😮'),
        ('sad', '😢'),
        ('angry', '😠'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='message_reactions')
    reaction_type = models.CharField(max_length=20, choices=REACTION_TYPES)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        unique_together = ['message', 'user', 'reaction_type']
    
    def __str__(self):
        return f"{self.user.email} reacted {self.reaction_type} to message"