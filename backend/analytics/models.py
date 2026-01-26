from django.db import models
from django.utils import timezone
import uuid

class AnalyticsSnapshot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    snapshot_type = models.CharField(max_length=50)  # daily, weekly, monthly
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()
    
    # User Analytics
    total_users = models.IntegerField(default=0)
    new_users = models.IntegerField(default=0)
    active_users = models.IntegerField(default=0)
    users_by_role = models.JSONField(default=dict)  # {admin: 5, organizer: 20, participant: 500}
    
    # Club Analytics
    total_clubs = models.IntegerField(default=0)
    active_clubs = models.IntegerField(default=0)
    pending_clubs = models.IntegerField(default=0)
    club_membership_stats = models.JSONField(default=dict)
    
    # Event Analytics
    total_events = models.IntegerField(default=0)
    events_by_type = models.JSONField(default=dict)
    events_by_status = models.JSONField(default=dict)
    total_registrations = models.IntegerField(default=0)
    avg_event_rating = models.FloatField(default=0.0)
    
    # Resource Analytics
    total_resources = models.IntegerField(default=0)
    resource_utilization = models.FloatField(default=0.0)  # Percentage
    total_bookings = models.IntegerField(default=0)
    booking_success_rate = models.FloatField(default=0.0)
    
    # Financial Analytics
    total_budget = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    budget_used = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    registration_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    # Engagement Metrics
    avg_club_memberships = models.FloatField(default=0.0)
    avg_event_registrations = models.FloatField(default=0.0)
    user_engagement_score = models.FloatField(default=0.0)
    
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        indexes = [
            models.Index(fields=['snapshot_type', 'period_start']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['-period_end']
    
    def __str__(self):
        return f"{self.snapshot_type} analytics for {self.period_end.date()}"

class ClubAnalytics(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    club = models.ForeignKey('clubs.Club', on_delete=models.CASCADE, related_name='analytics')
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()
    
    # Membership Stats
    total_members = models.IntegerField(default=0)
    new_members = models.IntegerField(default=0)
    members_by_role = models.JSONField(default=dict)
    
    # Event Stats
    events_hosted = models.IntegerField(default=0)
    event_registrations = models.IntegerField(default=0)
    avg_event_rating = models.FloatField(default=0.0)
    
    # Resource Usage
    resources_booked = models.IntegerField(default=0)
    booking_hours = models.FloatField(default=0.0)
    
    # Financials
    budget_allocated = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    budget_used = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    # Engagement
    member_engagement = models.FloatField(default=0.0)  # 0-100 score
    announcement_views = models.IntegerField(default=0)
    document_downloads = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        indexes = [
            models.Index(fields=['club', 'period_end']),
        ]
        ordering = ['-period_end']
    
    def __str__(self):
        return f"Analytics for {self.club.name} ({self.period_end.date()})"

class UserActivity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='activities')
    date = models.DateField(default=timezone.now)
    
    # Activity Counts
    login_count = models.IntegerField(default=0)
    event_views = models.IntegerField(default=0)
    event_registrations = models.IntegerField(default=0)
    resource_bookings = models.IntegerField(default=0)
    messages_sent = models.IntegerField(default=0)
    announcements_viewed = models.IntegerField(default=0)
    
    # Time Spent
    total_session_time = models.FloatField(default=0.0)  # in minutes
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['user', 'date']
        indexes = [
            models.Index(fields=['user', 'date']),
            models.Index(fields=['date']),
        ]
    
    def __str__(self):
        return f"{self.user.email} activity on {self.date}"