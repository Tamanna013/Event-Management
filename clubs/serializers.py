from rest_framework import serializers
from .models import Club, ClubInvitation, ClubAnnouncement, ClubDocument
from users.models import ClubMembership
from users.serializers import UserProfileSerializer

class ClubSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()
    is_member = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()
    
    class Meta:
        model = Club
        fields = [
            'id', 'name', 'slug', 'description', 'club_type', 'logo', 'banner_image',
            'status', 'email', 'website', 'social_links', 'member_count',
            'is_member', 'user_role', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at']
    
    def get_member_count(self, obj):
        # FIX: Directly query the model to avoid RelatedObjectDoesNotExist
        return ClubMembership.objects.filter(
            club=obj, 
            role__in=['head', 'coordinator', 'member']
        ).count()
    
    def get_is_member(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return ClubMembership.objects.filter(
                club=obj,
                user=request.user,
                role__in=['head', 'coordinator', 'member']
            ).exists()
        return False
    
    def get_user_role(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            membership = ClubMembership.objects.filter(
                club=obj,
                user=request.user
            ).first()
            return membership.role if membership else None
        return None

class ClubCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Club
        fields = ['name', 'description', 'club_type', 'email', 'website', 'social_links']
    
    def create(self, validated_data):
        request = self.context.get('request')
        club = Club.objects.create(
            **validated_data,
            created_by=request.user,
            slug=self.generate_slug(validated_data['name'])
        )
        
        # Automatically make creator the head of the club
        ClubMembership.objects.create(
            user=request.user,
            club=club,
            role='head'
        )
        
        return club
    
    def generate_slug(self, name):
        import re
        from django.utils.text import slugify
        base_slug = slugify(name)
        slug = base_slug
        counter = 1
        while Club.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        return slug

class ClubMembershipSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    club = ClubSerializer(read_only=True)
    
    class Meta:
        model = ClubMembership
        fields = ['id', 'user', 'club', 'role', 'permissions', 'joined_at']
        read_only_fields = ['id', 'joined_at']

class ClubInvitationSerializer(serializers.ModelSerializer):
    club = ClubSerializer(read_only=True)
    invited_by = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = ClubInvitation
        fields = [
            'id', 'club', 'email', 'invited_by', 'role', 'invitation_type',
            'status', 'expires_at', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class CreateInvitationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=ClubMembership.MEMBERSHIP_ROLES)
    invitation_type = serializers.ChoiceField(
        choices=ClubInvitation.INVITATION_TYPES,
        default='email'
    )

class ClubAnnouncementSerializer(serializers.ModelSerializer):
    created_by = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = ClubAnnouncement
        fields = ['id', 'club', 'title', 'content', 'created_by', 
                 'is_pinned', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

class ClubDocumentSerializer(serializers.ModelSerializer):
    uploaded_by = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = ClubDocument
        fields = ['id', 'club', 'title', 'description', 'document_type',
                 'file_url', 'uploaded_by', 'is_public', 'created_at']
        read_only_fields = ['id', 'created_at']