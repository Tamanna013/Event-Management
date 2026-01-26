from django.db import models
from django.utils import timezone
import uuid
from users.models import User
from clubs.models import Club

class Event(models.Model):
    EVENT_TYPES = (
        ('workshop', 'Workshop'),
        ('seminar', 'Seminar'),
        ('conference', 'Conference'),
        ('competition', 'Competition'),
        ('cultural', 'Cultural'),
        ('sports', 'Sports'),
        ('social', 'Social'),
        ('meeting', 'Meeting'),
        ('other', 'Other'),
    )
    
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('ongoing', 'Ongoing'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )
    
    VISIBILITY_CHOICES = (
        ('public', 'Public'),
        ('club_only', 'Club Members Only'),
        ('private', 'Private'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, max_length=200)
    description = models.TextField()
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES, default='other')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    visibility = models.CharField(max_length=20, choices=VISIBILITY_CHOICES, default='public')
    
    # Organizing clubs (for multi-club events)
    organizing_clubs = models.ManyToManyField(Club, related_name='organized_events')
    primary_club = models.ForeignKey(Club, on_delete=models.CASCADE, related_name='primary_events')
    
    # Event details
    location = models.CharField(max_length=200)
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    is_multiday = models.BooleanField(default=False)
    max_participants = models.IntegerField(null=True, blank=True)
    
    # Media
    banner_image = models.URLField(blank=True, null=True)
    gallery_images = models.JSONField(default=list)  # List of image URLs
    
    # Registration
    requires_registration = models.BooleanField(default=False)
    registration_deadline = models.DateTimeField(null=True, blank=True)
    registration_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    # Budget
    budget_allocated = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    budget_used = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    # Metadata
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_events')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='approved_events')
    approved_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['status']),
            models.Index(fields=['start_datetime']),
            models.Index(fields=['end_datetime']),
            models.Index(fields=['primary_club']),
        ]
    
    def __str__(self):
        return self.title
    
    @property
    def is_upcoming(self):
        return self.start_datetime > timezone.now() and self.status == 'approved'
    
    @property
    def is_ongoing(self):
        now = timezone.now()
        return self.start_datetime <= now <= self.end_datetime and self.status == 'approved'
    
    @property
    def has_ended(self):
        return self.end_datetime < timezone.now() or self.status in ['completed', 'cancelled']

class EventRegistration(models.Model):
    STATUS_CHOICES = (
        ('registered', 'Registered'),
        ('attended', 'Attended'),
        ('cancelled', 'Cancelled'),
        ('waitlisted', 'Waitlisted'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='registrations')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='event_registrations')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='registered')
    registered_at = models.DateTimeField(default=timezone.now)
    attended_at = models.DateTimeField(null=True, blank=True)
    payment_status = models.CharField(max_length=20, default='pending')  # pending, paid, refunded
    payment_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    notes = models.TextField(blank=True, null=True)
    
    class Meta:
        unique_together = ['event', 'user']
        indexes = [
            models.Index(fields=['event', 'user']),
            models.Index(fields=['status']),
            models.Index(fields=['registered_at']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.event.title}"

class EventCollaborator(models.Model):
    ROLE_CHOICES = (
        ('organizer', 'Organizer'),
        ('coordinator', 'Coordinator'),
        ('volunteer', 'Volunteer'),
        ('speaker', 'Speaker'),
        ('judge', 'Judge'),
        ('sponsor', 'Sponsor'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='collaborators')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='event_collaborations')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='volunteer')
    club = models.ForeignKey(Club, on_delete=models.CASCADE, null=True, blank=True)
    assigned_tasks = models.JSONField(default=list)  # List of assigned tasks
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        unique_together = ['event', 'user']
        indexes = [
            models.Index(fields=['event', 'user']),
            models.Index(fields=['role']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.event.title} ({self.role})"

class EventResource(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='resources')
    resource = models.ForeignKey('resources.Resource', on_delete=models.CASCADE, related_name='event_allocations')
    allocated_quantity = models.IntegerField(default=1)
    allocated_from = models.DateTimeField()
    allocated_until = models.DateTimeField()
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        indexes = [
            models.Index(fields=['event', 'resource']),
        ]
    
    def __str__(self):
        return f"{self.resource.name} for {self.event.title}"

class EventFeedback(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='feedbacks')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='event_feedbacks')
    rating = models.IntegerField()  # 1-5
    comments = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        unique_together = ['event', 'user']
        indexes = [
            models.Index(fields=['event', 'user']),
            models.Index(fields=['rating']),
        ]
    
    def __str__(self):
        return f"Feedback by {self.user.email} for {self.event.title}"