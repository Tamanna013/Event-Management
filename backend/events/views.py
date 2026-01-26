from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q, Count, Avg
from django_filters.rest_framework import DjangoFilterBackend

from .models import Event, EventRegistration, EventCollaborator, EventResource, EventFeedback
from .serializers import (
    EventSerializer, EventCreateSerializer, EventRegistrationSerializer,
    EventCollaboratorSerializer, EventResourceSerializer, EventFeedbackSerializer,
    SubmitFeedbackSerializer
)
from users.permissions import IsAdmin, IsAdminOrOrganizer
from clubs.models import ClubMembership

class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['event_type', 'status', 'primary_club']
    search_fields = ['title', 'description', 'location']
    ordering_fields = ['start_datetime', 'end_datetime', 'created_at']
    ordering = ['-start_datetime']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return EventCreateSerializer
        return super().get_serializer_class()
    
    def get_permissions(self):
        if self.action in ['create', 'destroy', 'approve', 'reject']:
            return [IsAdminOrOrganizer()]
        elif self.action in ['update', 'partial_update']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated()]
    
    def get_queryset(self):
        user = self.request.user
        
        # Base queryset
        queryset = Event.objects.all()
        
        # Filter based on user role and permissions
        if user.role == 'admin':
            return queryset
        
        # Get clubs user is a member of
        user_clubs = ClubMembership.objects.filter(
            user=user,
            role__in=['head', 'coordinator', 'member']
        ).values_list('club_id', flat=True)
        
        # Show events where:
        # 1. Event is public OR
        # 2. Event is club_only and user is member of organizing club OR
        # 3. Event is private and user is collaborator OR created the event
        if user.is_authenticated:
            queryset = queryset.filter(
                Q(visibility='public') |
                Q(visibility='club_only', organizing_clubs__id__in=user_clubs) |
                Q(visibility='private', created_by=user) |
                Q(visibility='private', collaborators__user=user)
            ).distinct()
        else:
            queryset = queryset.filter(visibility='public')
        
        # Filter by status (only show approved events to non-admins)
        if user.role != 'admin':
            queryset = queryset.filter(status='approved')
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            event = serializer.save()
            return Response(
                EventSerializer(event, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        event = self.get_object()
        
        if event.status != 'pending':
            return Response(
                {'error': 'Event is not pending approval.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        event.status = 'approved'
        event.approved_by = request.user
        event.approved_at = timezone.now()
        event.save()
        
        return Response(
            {'message': 'Event approved successfully.'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        event = self.get_object()
        
        if event.status != 'pending':
            return Response(
                {'error': 'Event is not pending approval.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        rejection_reason = request.data.get('reason', '')
        event.status = 'rejected'
        event.save()
        
        # TODO: Send notification to event creator
        
        return Response(
            {'message': 'Event rejected.', 'reason': rejection_reason},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def register(self, request, pk=None):
        event = self.get_object()
        user = request.user
        
        # Check if event requires registration
        if not event.requires_registration:
            return Response(
                {'error': 'This event does not require registration.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if registration deadline has passed
        if event.registration_deadline and event.registration_deadline < timezone.now():
            return Response(
                {'error': 'Registration deadline has passed.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if already registered
        existing_registration = EventRegistration.objects.filter(
            event=event,
            user=user
        ).first()
        
        if existing_registration:
            if existing_registration.status == 'cancelled':
                existing_registration.status = 'registered'
                existing_registration.save()
                return Response(
                    {'message': 'Registration restored.'},
                    status=status.HTTP_200_OK
                )
            return Response(
                {'error': 'Already registered for this event.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if slots available
        if event.max_participants:
            registered_count = EventRegistration.objects.filter(
                event=event,
                status__in=['registered', 'attended']
            ).count()
            
            if registered_count >= event.max_participants:
                # Add to waitlist
                registration = EventRegistration.objects.create(
                    event=event,
                    user=user,
                    status='waitlisted'
                )
                return Response(
                    {'message': 'Added to waitlist. No slots available.'},
                    status=status.HTTP_200_OK
                )
        
        # Create registration
        registration = EventRegistration.objects.create(
            event=event,
            user=user,
            payment_amount=event.registration_fee
        )
        
        # TODO: Process payment if registration_fee > 0
        
        return Response(
            {'message': 'Successfully registered for the event.'},
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def cancel_registration(self, request, pk=None):
        event = self.get_object()
        user = request.user
        
        try:
            registration = EventRegistration.objects.get(event=event, user=user)
        except EventRegistration.DoesNotExist:
            return Response(
                {'error': 'Not registered for this event.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        registration.status = 'cancelled'
        registration.save()
        
        # TODO: Process refund if needed
        
        return Response(
            {'message': 'Registration cancelled successfully.'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['get'])
    def registrations(self, request, pk=None):
        event = self.get_object()
        
        # Check permissions
        if not self.has_event_permission(event, request.user):
            return Response(
                {'error': 'You do not have permission to view registrations.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        registrations = event.registrations.all()
        serializer = EventRegistrationSerializer(registrations, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def feedback(self, request, pk=None):
        event = self.get_object()
        feedbacks = event.feedbacks.all()
        serializer = EventFeedbackSerializer(feedbacks, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def submit_feedback(self, request, pk=None):
        event = self.get_object()
        user = request.user
        
        # Check if user attended the event
        registration = EventRegistration.objects.filter(
            event=event,
            user=user,
            status='attended'
        ).first()
        
        if not registration:
            return Response(
                {'error': 'You must have attended the event to submit feedback.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if feedback already submitted
        if EventFeedback.objects.filter(event=event, user=user).exists():
            return Response(
                {'error': 'Feedback already submitted for this event.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = SubmitFeedbackSerializer(data=request.data)
        if serializer.is_valid():
            feedback = EventFeedback.objects.create(
                event=event,
                user=user,
                rating=serializer.validated_data['rating'],
                comments=serializer.validated_data.get('comments', '')
            )
            
            return Response(
                EventFeedbackSerializer(feedback).data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def has_event_permission(self, event, user):
        """Check if user has permission to manage event."""
        if user.role == 'admin':
            return True
        
        # Check if user is creator
        if event.created_by == user:
            return True
        
        # Check if user is collaborator with organizer/coordinator role
        collaborator = EventCollaborator.objects.filter(
            event=event,
            user=user,
            role__in=['organizer', 'coordinator']
        ).first()
        
        if collaborator:
            return True
        
        # Check if user is head/coordinator of organizing club
        user_clubs = ClubMembership.objects.filter(
            user=user,
            role__in=['head', 'coordinator']
        ).values_list('club_id', flat=True)
        
        return event.organizing_clubs.filter(id__in=user_clubs).exists()
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        queryset = self.get_queryset().filter(
            start_datetime__gt=timezone.now(),
            status='approved'
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def ongoing(self, request):
        now = timezone.now()
        queryset = self.get_queryset().filter(
            start_datetime__lte=now,
            end_datetime__gte=now,
            status='approved'
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def past(self, request):
        queryset = self.get_queryset().filter(
            end_datetime__lt=timezone.now(),
            status='approved'
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)