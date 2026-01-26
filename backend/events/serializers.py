from rest_framework import serializers
from .models import Event, EventRegistration, EventCollaborator, EventResource, EventFeedback
from clubs.serializers import ClubSerializer
from users.serializers import UserProfileSerializer

class EventSerializer(serializers.ModelSerializer):
    organizing_clubs = ClubSerializer(many=True, read_only=True)
    primary_club = ClubSerializer(read_only=True)
    created_by = UserProfileSerializer(read_only=True)
    is_registered = serializers.SerializerMethodField()
    registration_count = serializers.SerializerMethodField()
    available_slots = serializers.SerializerMethodField()
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'slug', 'description', 'event_type', 'status', 'visibility',
            'organizing_clubs', 'primary_club', 'location', 'start_datetime', 'end_datetime',
            'is_multiday', 'max_participants', 'banner_image', 'gallery_images',
            'requires_registration', 'registration_deadline', 'registration_fee',
            'budget_allocated', 'budget_used', 'created_by', 'created_at', 'updated_at',
            'is_registered', 'registration_count', 'available_slots'
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']
    
    def get_is_registered(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return EventRegistration.objects.filter(
                event=obj,
                user=request.user,
                status__in=['registered', 'attended']
            ).exists()
        return False
    
    def get_registration_count(self, obj):
        return obj.registrations.filter(status__in=['registered', 'attended']).count()
    
    def get_available_slots(self, obj):
        if obj.max_participants:
            registered = obj.registrations.filter(status__in=['registered', 'attended']).count()
            return max(0, obj.max_participants - registered)
        return None

class EventCreateSerializer(serializers.ModelSerializer):
    organizing_club_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Event
        fields = [
            'title', 'description', 'event_type', 'visibility', 'organizing_club_ids',
            'primary_club', 'location', 'start_datetime', 'end_datetime',
            'max_participants', 'banner_image', 'requires_registration',
            'registration_deadline', 'registration_fee', 'budget_allocated'
        ]
    
    def create(self, validated_data):
        request = self.context.get('request')
        organizing_club_ids = validated_data.pop('organizing_club_ids', [])
        
        # Generate slug
        from django.utils.text import slugify
        base_slug = slugify(validated_data['title'])
        slug = base_slug
        counter = 1
        while Event.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        
        event = Event.objects.create(
            **validated_data,
            created_by=request.user,
            slug=slug
        )
        
        # Add organizing clubs
        if organizing_club_ids:
            from clubs.models import Club
            clubs = Club.objects.filter(id__in=organizing_club_ids)
            event.organizing_clubs.set(clubs)
        
        return event

class EventRegistrationSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    event = EventSerializer(read_only=True)
    
    class Meta:
        model = EventRegistration
        fields = [
            'id', 'event', 'user', 'status', 'registered_at', 'attended_at',
            'payment_status', 'payment_amount', 'notes'
        ]
        read_only_fields = ['id', 'registered_at']

class EventCollaboratorSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    event = EventSerializer(read_only=True)
    club = ClubSerializer(read_only=True)
    
    class Meta:
        model = EventCollaborator
        fields = ['id', 'event', 'user', 'role', 'club', 'assigned_tasks', 'created_at']
        read_only_fields = ['id', 'created_at']

class EventResourceSerializer(serializers.ModelSerializer):
    from resources.serializers import ResourceSerializer
    resource = ResourceSerializer(read_only=True)
    event = EventSerializer(read_only=True)
    
    class Meta:
        model = EventResource
        fields = ['id', 'event', 'resource', 'allocated_quantity', 
                 'allocated_from', 'allocated_until', 'notes', 'created_at']
        read_only_fields = ['id', 'created_at']

class EventFeedbackSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    event = EventSerializer(read_only=True)
    
    class Meta:
        model = EventFeedback
        fields = ['id', 'event', 'user', 'rating', 'comments', 'created_at']
        read_only_fields = ['id', 'created_at']

class SubmitFeedbackSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comments = serializers.CharField(required=False, allow_blank=True)