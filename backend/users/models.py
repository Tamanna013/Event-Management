from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.hashers import make_password
from django.utils import timezone
import uuid

class User(AbstractUser):
    USER_ROLES = (
        ('admin', 'Admin'),
        ('organizer', 'Organizer'),
        ('participant', 'Participant'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, unique=True)  # Explicitly added
    department = models.CharField(max_length=100, blank=True, null=True)
    year = models.CharField(max_length=50, blank=True, null=True)
    role = models.CharField(max_length=20, choices=USER_ROLES, default='participant')
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    profile_picture = models.URLField(blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Visibility settings
    show_email = models.BooleanField(default=False)
    show_phone = models.BooleanField(default=False)
    show_department = models.BooleanField(default=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    class Meta:
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['role']),
            models.Index(fields=['department']),
        ]
    
    def __str__(self):
        return f"{self.email} ({self.role})"

class OTP(models.Model):
    OTP_PURPOSES = (
        ('password_reset', 'Password Reset'),
        ('login', 'Login'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otps')
    otp_code = models.CharField(max_length=6)
    purpose = models.CharField(max_length=50, choices=OTP_PURPOSES)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'purpose', 'is_used']),
            models.Index(fields=['expires_at']),
        ]
    
    def is_valid(self):
        return not self.is_used and timezone.now() <= self.expires_at

class ClubMembership(models.Model):
    MEMBERSHIP_ROLES = (
        ('head', 'Head'),
        ('coordinator', 'Coordinator'),
        ('member', 'Member'),
        ('pending', 'Pending'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='club_memberships')
    club = models.ForeignKey('clubs.Club', on_delete=models.CASCADE, related_name='memberships')
    role = models.CharField(max_length=20, choices=MEMBERSHIP_ROLES, default='member')
    joined_at = models.DateTimeField(default=timezone.now)
    permissions = models.JSONField(default=dict)
    
    class Meta:
        unique_together = ['user', 'club']
        indexes = [
            models.Index(fields=['user', 'club']),
            models.Index(fields=['role']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.club.name} ({self.role})"

class UserActivityLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activity_logs')
    action = models.CharField(max_length=100)
    details = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['action']),
        ]