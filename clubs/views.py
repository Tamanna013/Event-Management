from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
import secrets

# REMOVED: from streamlit import user (Incorrect import)

from .models import Club, ClubInvitation, ClubAnnouncement, ClubDocument
from .serializers import (
    ClubSerializer, ClubCreateSerializer, ClubMembershipSerializer,
    ClubInvitationSerializer, CreateInvitationSerializer,
    ClubAnnouncementSerializer, ClubDocumentSerializer
)
from users.models import ClubMembership, User
from users.permissions import IsAdmin, IsOrganizer

class ClubViewSet(viewsets.ModelViewSet):
    queryset = Club.objects.all()
    serializer_class = ClubSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'slug'
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ClubCreateSerializer
        return super().get_serializer_class()
    
    def get_permissions(self):
        if self.action in ['create', 'destroy']:
            return [IsOrganizer()]
        elif self.action in ['update', 'partial_update']:
            return [IsAdmin()]
        return super().get_permissions()
    
    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Club.objects.none()

        queryset = Club.objects.all()

        if self.request.query_params.get('member') == 'true':
            membership_ids = ClubMembership.objects.filter(
                user=user,
                role__in=['head', 'coordinator', 'member']
            ).values_list('club_id', flat=True)
            queryset = queryset.filter(id__in=membership_ids)

        if user.role == 'admin':
            return queryset

        return queryset.filter(status='active')
    
    @action(detail=True, methods=['get'])
    def members(self, request, slug=None):
        club = self.get_object()
        # Optimization: use select_related to get user data in one query
        memberships = ClubMembership.objects.filter(club=club).select_related('user')
        
        # Check if user is allowed to see the list
        if request.user.role != 'admin':
            is_member = memberships.filter(user=request.user).exists()
            if not is_member:
                return Response({'error': 'Not a member.'}, status=403)
        
        serializer = ClubMembershipSerializer(memberships, many=True)
        return Response(serializer.data)

    # ... (Rest of your join/invite actions are logically sound!)
    
    @action(detail=True, methods=['post'])
    def join(self, request, slug=None):
        club = self.get_object()
        user = request.user
        
        # Check if club is open for joining
        if not club.is_public:
            return Response(
                {'error': 'This club is not open for public joining.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if already a member
        existing_membership = ClubMembership.objects.filter(club=club, user=user).first()
        if existing_membership:
            if existing_membership.role == 'pending':
                return Response(
                    {'error': 'Your join request is pending approval.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            return Response(
                {'error': 'Already a member of this club.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create membership with pending status if club requires approval
        role = 'pending' if club.requires_approval else 'member'
        membership = ClubMembership.objects.create(
            club=club,
            user=user,
            role=role
        )
        
        message = 'Join request submitted. Waiting for approval.' if club.requires_approval else 'Successfully joined the club!'
        
        return Response(
            {'message': message, 'membership': ClubMembershipSerializer(membership).data},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def approve(self, request, slug=None):
        club = self.get_object()
        club.status = 'active'
        club.approved_by = request.user
        club.approved_at = timezone.now()
        club.save()
        
        return Response(
            {'message': 'Club approved successfully.'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def invite(self, request, slug=None):
        club = self.get_object()
        
        # Check if user has permission to invite
        membership = ClubMembership.objects.filter(
            club=club,
            user=request.user,
            role__in=['head', 'coordinator']
        ).first()
        
        if not membership and request.user.role != 'admin':
            return Response(
                {'error': 'You do not have permission to invite members.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = CreateInvitationSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            role = serializer.validated_data['role']
            invitation_type = serializer.validated_data.get('invitation_type', 'email')
            
            # Check if user exists
            try:
                user = User.objects.get(email=email)
                # Check if already a member
                if ClubMembership.objects.filter(club=club, user=user).exists():
                    return Response(
                        {'error': 'User is already a member of this club.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except User.DoesNotExist:
                user = None
            
            # Generate token
            token = secrets.token_urlsafe(32)
            expires_at = timezone.now() + timedelta(days=7)
            
            # Create invitation
            invitation = ClubInvitation.objects.create(
                club=club,
                email=email,
                invited_by=request.user,
                role=role,
                invitation_type=invitation_type,
                token=token,
                expires_at=expires_at
            )
            
            # TODO: Send invitation email
            invitation_url = f"{request.build_absolute_uri('/')}api/clubs/invitations/accept/{token}"
            
            return Response({
                'message': 'Invitation sent successfully.',
                'invitation_id': str(invitation.id),
                'invitation_url': invitation_url if invitation_type == 'link' else None,
                'expires_at': expires_at
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def announcements(self, request, slug=None):
        club = self.get_object()
        user = request.user
        
        # Check if user is member
        is_member = ClubMembership.objects.filter(
            club=club,
            user=user,
            role__in=['head', 'coordinator', 'member']
        ).exists()
        
        if not is_member and user.role != 'admin':
            return Response(
                {'error': 'You must be a member to view announcements.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        announcements = club.announcements.all().order_by('-created_at')
        serializer = ClubAnnouncementSerializer(announcements, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def documents(self, request, slug=None):
        club = self.get_object()
        user = request.user
        
        # Check if user is member
        is_member = ClubMembership.objects.filter(
            club=club,
            user=user,
            role__in=['head', 'coordinator', 'member']
        ).exists()
        
        # Admins and club members can see all documents
        if is_member or user.role == 'admin':
            documents = club.documents.all()
        else:
            # Non-members can only see public documents
            documents = club.documents.filter(is_public=True)
        
        serializer = ClubDocumentSerializer(documents, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def leave(self, request, slug=None):
        club = self.get_object()
        user = request.user
        
        try:
            membership = ClubMembership.objects.get(club=club, user=user)
            # Don't allow heads to leave if they're the only head
            if membership.role == 'head':
                other_heads = ClubMembership.objects.filter(
                    club=club,
                    role='head'
                ).exclude(user=user)
                if not other_heads.exists():
                    return Response(
                        {'error': 'You are the only head of this club. Please assign a new head before leaving.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            membership.delete()
            return Response(
                {'message': 'Successfully left the club.'},
                status=status.HTTP_200_OK
            )
        except ClubMembership.DoesNotExist:
            return Response(
                {'error': 'You are not a member of this club.'},
                status=status.HTTP_400_BAD_REQUEST
            )

class ClubInvitationViewSet(viewsets.GenericViewSet):
    queryset = ClubInvitation.objects.all()
    serializer_class = ClubInvitationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'], url_path='my-invitations')
    def my_invitations(self, request):
        invitations = ClubInvitation.objects.filter(
            email=request.user.email,
            status='pending'
        ).filter(expires_at__gte=timezone.now())
        
        serializer = self.get_serializer(invitations, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], url_path='accept/(?P<token>[^/.]+)')
    def accept_invitation(self, request, token=None):
        try:
            invitation = ClubInvitation.objects.get(token=token, status='pending')
        except ClubInvitation.DoesNotExist:
            return Response(
                {'error': 'Invalid or expired invitation.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if not invitation.is_valid():
            invitation.status = 'expired'
            invitation.save()
            return Response(
                {'error': 'Invitation has expired.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify the accepting user matches the invitation email
        if request.user.email != invitation.email:
            return Response(
                {'error': 'This invitation is not for your account.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if already a member
        if ClubMembership.objects.filter(club=invitation.club, user=request.user).exists():
            invitation.status = 'accepted'
            invitation.save()
            return Response(
                {'error': 'You are already a member of this club.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create membership
        membership = ClubMembership.objects.create(
            user=request.user,
            club=invitation.club,
            role=invitation.role
        )
        
        # Update invitation status
        invitation.status = 'accepted'
        invitation.accepted_at = timezone.now()
        invitation.save()
        
        return Response({
            'message': f'Successfully joined {invitation.club.name} as {invitation.role}.',
            'membership': ClubMembershipSerializer(membership).data
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'], url_path='decline/(?P<token>[^/.]+)')
    def decline_invitation(self, request, token=None):
        try:
            invitation = ClubInvitation.objects.get(token=token, status='pending')
        except ClubInvitation.DoesNotExist:
            return Response(
                {'error': 'Invalid or expired invitation.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verify the declining user matches the invitation email
        if request.user.email != invitation.email:
            return Response(
                {'error': 'This invitation is not for your account.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        invitation.status = 'rejected'
        invitation.save()
        
        return Response(
            {'message': 'Invitation declined.'},
            status=status.HTTP_200_OK
        )