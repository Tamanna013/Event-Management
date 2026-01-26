from django.db import models
from django.utils import timezone
import uuid
from users.models import User

class ResourceCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        verbose_name_plural = 'Resource Categories'
        ordering = ['name']
    
    def __str__(self):
        return self.name

class Resource(models.Model):
    RESOURCE_TYPES = (
        ('room', 'Room/Hall'),
        ('equipment', 'Equipment'),
        ('vehicle', 'Vehicle'),
        ('other', 'Other'),
    )
    
    STATUS_CHOICES = (
        ('available', 'Available'),
        ('in_use', 'In Use'),
        ('maintenance', 'Under Maintenance'),
        ('unavailable', 'Unavailable'),
    )
    
    BOOKING_TYPE_CHOICES = (
        ('auto', 'Auto-Approved'),
        ('manual', 'Requires Approval'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    resource_type = models.CharField(max_length=50, choices=RESOURCE_TYPES, default='other')
    category = models.ForeignKey(ResourceCategory, on_delete=models.SET_NULL, null=True, related_name='resources')
    location = models.CharField(max_length=200, blank=True, null=True)
    
    # Specifications
    capacity = models.IntegerField(null=True, blank=True)  # For rooms
    specifications = models.JSONField(default=dict)  # JSON for flexible specs
    
    # Availability
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    booking_type = models.CharField(max_length=20, choices=BOOKING_TYPE_CHOICES, default='manual')
    
    # Access control
    allowed_clubs = models.ManyToManyField('clubs.Club', blank=True, related_name='accessible_resources')
    requires_training = models.BooleanField(default=False)
    
    # Booking rules
    max_booking_duration = models.IntegerField(default=4, help_text="Maximum booking duration in hours")
    min_advance_booking = models.IntegerField(default=1, help_text="Minimum hours before booking")
    max_advance_booking = models.IntegerField(default=168, help_text="Maximum hours before booking (168 = 1 week)")
    
    # Metadata
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_resources')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['resource_type']),
            models.Index(fields=['status']),
            models.Index(fields=['booking_type']),
        ]
    
    def __str__(self):
        return self.name
    
    @property
    def is_available(self):
        return self.status == 'available'

class ResourceBooking(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('confirmed', 'Confirmed'),
        ('ongoing', 'In Use'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resource = models.ForeignKey(Resource, on_delete=models.CASCADE, related_name='bookings')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='resource_bookings')
    
    # Booking details
    purpose = models.TextField()
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Related entities
    club = models.ForeignKey('clubs.Club', on_delete=models.SET_NULL, null=True, blank=True, related_name='bookings')
    event = models.ForeignKey('events.Event', on_delete=models.SET_NULL, null=True, blank=True, related_name='resource_bookings')
    
    # Approval
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='approved_bookings')
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, null=True)
    
    # Usage tracking
    actual_start_time = models.DateTimeField(null=True, blank=True)
    actual_end_time = models.DateTimeField(null=True, blank=True)
    usage_notes = models.TextField(blank=True, null=True)
    
    # Metadata
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['resource', 'start_time', 'end_time']),
            models.Index(fields=['user']),
            models.Index(fields=['status']),
            models.Index(fields=['start_time']),
        ]
    
    def __str__(self):
        return f"{self.resource.name} - {self.user.email}"
    
    @property
    def duration_hours(self):
        duration = self.end_time - self.start_time
        return duration.total_seconds() / 3600
    
    @property
    def is_conflict(self):
        """Check if this booking conflicts with existing approved bookings."""
        conflicts = ResourceBooking.objects.filter(
            resource=self.resource,
            status__in=['approved', 'confirmed', 'ongoing'],
            start_time__lt=self.end_time,
            end_time__gt=self.start_time
        ).exclude(id=self.id)
        return conflicts.exists()
    
    @property
    def is_active(self):
        now = timezone.now()
        return self.start_time <= now <= self.end_time and self.status in ['approved', 'confirmed']

class ResourceMaintenance(models.Model):
    MAINTENANCE_TYPES = (
        ('scheduled', 'Scheduled Maintenance'),
        ('repair', 'Repair'),
        ('inspection', 'Inspection'),
        ('other', 'Other'),
    )
    
    STATUS_CHOICES = (
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    resource = models.ForeignKey(Resource, on_delete=models.CASCADE, related_name='maintenances')
    maintenance_type = models.CharField(max_length=50, choices=MAINTENANCE_TYPES, default='scheduled')
    description = models.TextField()
    scheduled_start = models.DateTimeField()
    scheduled_end = models.DateTimeField()
    actual_start = models.DateTimeField(null=True, blank=True)
    actual_end = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    performed_by = models.CharField(max_length=200, blank=True, null=True)
    cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        indexes = [
            models.Index(fields=['resource', 'scheduled_start']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.resource.name} - {self.maintenance_type}"

class ResourceUsageLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(ResourceBooking, on_delete=models.CASCADE, related_name='usage_logs')
    check_in_time = models.DateTimeField()
    check_out_time = models.DateTimeField(null=True, blank=True)
    check_in_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='check_ins')
    check_out_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='check_outs')
    condition_before = models.JSONField(default=dict)
    condition_after = models.JSONField(default=dict, blank=True, null=True)
    issues_reported = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        indexes = [
            models.Index(fields=['booking']),
            models.Index(fields=['check_in_time']),
        ]
    
    def __str__(self):
        return f"Usage log for {self.booking.resource.name}"