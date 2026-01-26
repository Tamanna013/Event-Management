from rest_framework import serializers
from .models import ResourceCategory, Resource, ResourceBooking, ResourceMaintenance, ResourceUsageLog
from clubs.serializers import ClubSerializer
from users.serializers import UserProfileSerializer
from events.serializers import EventSerializer
from django.utils import timezone
from datetime import timedelta

class ResourceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ResourceCategory
        fields = ['id', 'name', 'description', 'created_at']
        read_only_fields = ['id', 'created_at']

class ResourceSerializer(serializers.ModelSerializer):
    category = ResourceCategorySerializer(read_only=True)
    allowed_clubs = ClubSerializer(many=True, read_only=True)
    created_by = UserProfileSerializer(read_only=True)
    is_available = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Resource
        fields = [
            'id', 'name', 'description', 'resource_type', 'category', 'location',
            'capacity', 'specifications', 'status', 'booking_type',
            'allowed_clubs', 'requires_training', 'max_booking_duration',
            'min_advance_booking', 'max_advance_booking', 'created_by',
            'created_at', 'updated_at', 'is_available'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class ResourceCreateSerializer(serializers.ModelSerializer):
    allowed_club_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Resource
        fields = [
            'name', 'description', 'resource_type', 'category', 'location',
            'capacity', 'specifications', 'booking_type', 'allowed_club_ids',
            'requires_training', 'max_booking_duration', 'min_advance_booking',
            'max_advance_booking'
        ]
    
    def create(self, validated_data):
        request = self.context.get('request')
        allowed_club_ids = validated_data.pop('allowed_club_ids', [])
        
        resource = Resource.objects.create(
            **validated_data,
            created_by=request.user
        )
        
        # Add allowed clubs
        if allowed_club_ids:
            from clubs.models import Club
            clubs = Club.objects.filter(id__in=allowed_club_ids)
            resource.allowed_clubs.set(clubs)
        
        return resource

class ResourceBookingSerializer(serializers.ModelSerializer):
    resource = ResourceSerializer(read_only=True)
    user = UserProfileSerializer(read_only=True)
    club = ClubSerializer(read_only=True)
    event = EventSerializer(read_only=True)
    approved_by = UserProfileSerializer(read_only=True)
    duration_hours = serializers.FloatField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = ResourceBooking
        fields = [
            'id', 'resource', 'user', 'purpose', 'start_time', 'end_time',
            'status', 'club', 'event', 'approved_by', 'approved_at',
            'rejection_reason', 'actual_start_time', 'actual_end_time',
            'usage_notes', 'duration_hours', 'is_active', 'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class CreateBookingSerializer(serializers.ModelSerializer):
    resource_id = serializers.UUIDField(write_only=True)
    club_id = serializers.UUIDField(required=False, allow_null=True)
    event_id = serializers.UUIDField(required=False, allow_null=True)
    
    class Meta:
        model = ResourceBooking
        fields = ['resource_id', 'purpose', 'start_time', 'end_time', 'club_id', 'event_id']
    
    def validate(self, data):
        # Get resource
        from .models import Resource
        try:
            resource = Resource.objects.get(id=data['resource_id'])
        except Resource.DoesNotExist:
            raise serializers.ValidationError({'resource_id': 'Resource not found.'})
        
        # Check resource availability
        if resource.status != 'available':
            raise serializers.ValidationError(
                f'Resource is currently {resource.get_status_display()}.'
            )
        
        # Validate booking times
        start_time = data['start_time']
        end_time = data['end_time']
        now = timezone.now()
        
        if start_time >= end_time:
            raise serializers.ValidationError('End time must be after start time.')
        
        if start_time < now:
            raise serializers.ValidationError('Cannot book in the past.')
        
        # Check min advance booking
        min_advance = timedelta(hours=resource.min_advance_booking)
        if start_time < now + min_advance:
            raise serializers.ValidationError(
                f'Must book at least {resource.min_advance_booking} hours in advance.'
            )
        
        # Check max advance booking
        max_advance = timedelta(hours=resource.max_advance_booking)
        if start_time > now + max_advance:
            raise serializers.ValidationError(
                f'Cannot book more than {resource.max_advance_booking} hours in advance.'
            )
        
        # Check max duration
        max_duration = timedelta(hours=resource.max_booking_duration)
        if (end_time - start_time) > max_duration:
            raise serializers.ValidationError(
                f'Maximum booking duration is {resource.max_booking_duration} hours.'
            )
        
        # Check for conflicts
        conflicts = ResourceBooking.objects.filter(
            resource=resource,
            status__in=['pending', 'approved', 'confirmed', 'ongoing'],
            start_time__lt=end_time,
            end_time__gt=start_time
        ).exists()
        
        if conflicts:
            raise serializers.ValidationError('Resource already booked for this time slot.')
        
        # Check if resource has scheduled maintenance
        conflicts_maintenance = ResourceMaintenance.objects.filter(
            resource=resource,
            status__in=['scheduled', 'in_progress'],
            scheduled_start__lt=end_time,
            scheduled_end__gt=start_time
        ).exists()
        
        if conflicts_maintenance:
            raise serializers.ValidationError('Resource has scheduled maintenance during this time.')
        
        data['resource'] = resource
        return data
    
    def create(self, validated_data):
        request = self.context.get('request')
        resource = validated_data.pop('resource')
        club_id = validated_data.pop('club_id', None)
        event_id = validated_data.pop('event_id', None)
        
        # Determine status based on booking type
        status = 'approved' if resource.booking_type == 'auto' else 'pending'
        
        booking = ResourceBooking.objects.create(
            resource=resource,
            user=request.user,
            club_id=club_id,
            event_id=event_id,
            status=status,
            **validated_data
        )
        
        # Auto-approve if needed
        if status == 'approved':
            booking.approved_by = request.user
            booking.approved_at = timezone.now()
            booking.save()
        
        return booking

class ResourceMaintenanceSerializer(serializers.ModelSerializer):
    resource = ResourceSerializer(read_only=True)
    created_by = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = ResourceMaintenance
        fields = [
            'id', 'resource', 'maintenance_type', 'description',
            'scheduled_start', 'scheduled_end', 'actual_start', 'actual_end',
            'status', 'performed_by', 'cost', 'notes', 'created_by', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class ResourceUsageLogSerializer(serializers.ModelSerializer):
    booking = ResourceBookingSerializer(read_only=True)
    check_in_by = UserProfileSerializer(read_only=True)
    check_out_by = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = ResourceUsageLog
        fields = [
            'id', 'booking', 'check_in_time', 'check_out_time',
            'check_in_by', 'check_out_by', 'condition_before',
            'condition_after', 'issues_reported', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']