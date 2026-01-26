from rest_framework import serializers
from .models import AnalyticsSnapshot, ClubAnalytics, UserActivity
from clubs.serializers import ClubSerializer
from users.serializers import UserProfileSerializer

class AnalyticsSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalyticsSnapshot
        fields = [
            'id', 'snapshot_type', 'period_start', 'period_end',
            'total_users', 'new_users', 'active_users', 'users_by_role',
            'total_clubs', 'active_clubs', 'pending_clubs', 'club_membership_stats',
            'total_events', 'events_by_type', 'events_by_status', 'total_registrations',
            'avg_event_rating', 'total_resources', 'resource_utilization',
            'total_bookings', 'booking_success_rate', 'total_budget',
            'budget_used', 'registration_revenue', 'avg_club_memberships',
            'avg_event_registrations', 'user_engagement_score', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class ClubAnalyticsSerializer(serializers.ModelSerializer):
    club = ClubSerializer(read_only=True)
    
    class Meta:
        model = ClubAnalytics
        fields = [
            'id', 'club', 'period_start', 'period_end',
            'total_members', 'new_members', 'members_by_role',
            'events_hosted', 'event_registrations', 'avg_event_rating',
            'resources_booked', 'booking_hours', 'budget_allocated',
            'budget_used', 'member_engagement', 'announcement_views',
            'document_downloads', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class UserActivitySerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = UserActivity
        fields = [
            'id', 'user', 'date', 'login_count', 'event_views',
            'event_registrations', 'resource_bookings', 'messages_sent',
            'announcements_viewed', 'total_session_time', 'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class DateRangeSerializer(serializers.Serializer):
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    club_id = serializers.UUIDField(required=False)
    
    def validate(self, data):
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError("End date must be after start date.")
        
        return data