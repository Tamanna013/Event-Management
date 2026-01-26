from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend

from .models import ResourceCategory, Resource, ResourceBooking, ResourceMaintenance, ResourceUsageLog
from .serializers import (
    ResourceCategorySerializer, ResourceSerializer, ResourceCreateSerializer,
    ResourceBookingSerializer, CreateBookingSerializer, ResourceMaintenanceSerializer,
    ResourceUsageLogSerializer
)
from users.permissions import IsAdmin, IsAdminOrOrganizer
from clubs.models import ClubMembership

class ResourceCategoryViewSet(viewsets.ModelViewSet):
    queryset = ResourceCategory.objects.all()
    serializer_class = ResourceCategorySerializer
    permission_classes = [IsAdmin]
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return super().get_permissions()

class ResourceViewSet(viewsets.ModelViewSet):
    queryset = Resource.objects.all()
    serializer_class = ResourceSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['resource_type', 'status', 'category', 'booking_type']
    search_fields = ['name', 'description', 'location']
    ordering_fields = ['name', 'created_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ResourceCreateSerializer
        return super().get_serializer_class()
    
    def get_permissions(self):
        if self.action in ['create', 'destroy', 'update', 'partial_update']:
            return [IsAdminOrOrganizer()]
        return [permissions.IsAuthenticated()]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'admin':
            return Resource.objects.all()
        
        # Get clubs user is a member of
        user_clubs = ClubMembership.objects.filter(
            user=user,
            role__in=['head', 'coordinator', 'member']
        ).values_list('club_id', flat=True)
        
        # Show resources that:
        # 1. Have no club restrictions OR
        # 2. Are restricted to clubs user is a member of
        queryset = Resource.objects.filter(
            Q(allowed_clubs__isnull=True) |
            Q(allowed_clubs__id__in=user_clubs)
        ).distinct()
        
        # Filter out unavailable resources for non-admins
        if user.role != 'admin':
            queryset = queryset.filter(status='available')
        
        return queryset
    
    @action(detail=True, methods=['get'])
    def availability(self, request, pk=None):
        resource = self.get_object()
        
        # Get requested date range (default: next 7 days)
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if start_date:
            start_date = timezone.datetime.fromisoformat(start_date)
        else:
            start_date = timezone.now()
        
        if end_date:
            end_date = timezone.datetime.fromisoformat(end_date)
        else:
            end_date = start_date + timezone.timedelta(days=7)
        
        # Get bookings in this range
        bookings = ResourceBooking.objects.filter(
            resource=resource,
            start_time__lt=end_date,
            end_time__gt=start_date,
            status__in=['approved', 'confirmed', 'ongoing']
        ).order_by('start_time')
        
        # Get maintenance schedules
        maintenances = ResourceMaintenance.objects.filter(
            resource=resource,
            scheduled_start__lt=end_date,
            scheduled_end__gt=start_date,
            status__in=['scheduled', 'in_progress']
        ).order_by('scheduled_start')
        
        availability_data = {
            'resource': ResourceSerializer(resource).data,
            'bookings': ResourceBookingSerializer(bookings, many=True).data,
            'maintenances': ResourceMaintenanceSerializer(maintenances, many=True).data,
            'time_range': {
                'start': start_date,
                'end': end_date
            }
        }
        
        return Response(availability_data)
    
    @action(detail=True, methods=['get'])
    def bookings(self, request, pk=None):
        resource = self.get_object()
        user = request.user
        
        # Check permissions
        if user.role != 'admin':
            # Check if user is head/coordinator of allowed clubs
            user_clubs = ClubMembership.objects.filter(
                user=user,
                role__in=['head', 'coordinator']
            ).values_list('club_id', flat=True)
            
            if not resource.allowed_clubs.filter(id__in=user_clubs).exists():
                return Response(
                    {'error': 'You do not have permission to view bookings for this resource.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        bookings = resource.bookings.all()
        serializer = ResourceBookingSerializer(bookings, many=True)
        return Response(serializer.data)

class ResourceBookingViewSet(viewsets.ModelViewSet):
    queryset = ResourceBooking.objects.all()
    serializer_class = ResourceBookingSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'resource', 'club', 'event']
    ordering_fields = ['start_time', 'created_at']
    ordering = ['-start_time']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateBookingSerializer
        return super().get_serializer_class()
    
    def get_permissions(self):
        if self.action in ['approve', 'reject', 'check_in', 'check_out']:
            return [IsAdminOrOrganizer()]
        return [permissions.IsAuthenticated()]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'admin':
            return ResourceBooking.objects.all()
        
        # Users can see their own bookings
        queryset = ResourceBooking.objects.filter(user=user)
        
        # Organizers can see bookings for their clubs
        if user.role == 'organizer':
            user_clubs = ClubMembership.objects.filter(
                user=user,
                role__in=['head', 'coordinator']
            ).values_list('club_id', flat=True)
            
            club_bookings = ResourceBooking.objects.filter(club_id__in=user_clubs)
            queryset = queryset.union(club_bookings)
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            booking = serializer.save()
            return Response(
                ResourceBookingSerializer(booking).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        booking = self.get_object()
        
        if booking.status != 'pending':
            return Response(
                {'error': 'Booking is not pending approval.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check for conflicts
        if booking.is_conflict:
            return Response(
                {'error': 'Cannot approve: Time slot conflicts with existing booking.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        booking.status = 'approved'
        booking.approved_by = request.user
        booking.approved_at = timezone.now()
        booking.save()
        
        # TODO: Send notification to user
        
        return Response(
            {'message': 'Booking approved successfully.'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        booking = self.get_object()
        
        if booking.status != 'pending':
            return Response(
                {'error': 'Booking is not pending approval.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        rejection_reason = request.data.get('reason', '')
        
        booking.status = 'rejected'
        booking.rejection_reason = rejection_reason
        booking.save()
        
        # TODO: Send notification to user
        
        return Response(
            {'message': 'Booking rejected.'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        booking = self.get_object()
        user = request.user
        
        # Check permissions
        if booking.user != user and user.role != 'admin':
            return Response(
                {'error': 'You can only cancel your own bookings.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if booking.status in ['cancelled', 'completed']:
            return Response(
                {'error': f'Booking is already {booking.status}.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        booking.status = 'cancelled'
        booking.save()
        
        return Response(
            {'message': 'Booking cancelled successfully.'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def check_in(self, request, pk=None):
        booking = self.get_object()
        
        if booking.status != 'approved':
            return Response(
                {'error': 'Only approved bookings can be checked in.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        now = timezone.now()
        
        # Allow check-in up to 30 minutes before start
        if now < booking.start_time - timezone.timedelta(minutes=30):
            return Response(
                {'error': 'Too early to check in. Please wait until 30 minutes before start.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if already checked in
        if ResourceUsageLog.objects.filter(booking=booking, check_out_time__isnull=True).exists():
            return Response(
                {'error': 'Already checked in.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Record condition
        condition_before = request.data.get('condition_before', {})
        
        usage_log = ResourceUsageLog.objects.create(
            booking=booking,
            check_in_time=now,
            check_in_by=request.user,
            condition_before=condition_before
        )
        
        booking.status = 'ongoing'
        booking.actual_start_time = now
        booking.save()
        
        return Response(
            {
                'message': 'Checked in successfully.',
                'usage_log_id': str(usage_log.id)
            },
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def check_out(self, request, pk=None):
        booking = self.get_object()
        
        if booking.status != 'ongoing':
            return Response(
                {'error': 'Resource is not currently checked out.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get active usage log
        try:
            usage_log = ResourceUsageLog.objects.get(
                booking=booking,
                check_out_time__isnull=True
            )
        except ResourceUsageLog.DoesNotExist:
            return Response(
                {'error': 'No active check-in found.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        now = timezone.now()
        
        # Record condition after
        condition_after = request.data.get('condition_after', {})
        issues_reported = request.data.get('issues_reported', '')
        
        usage_log.check_out_time = now
        usage_log.check_out_by = request.user
        usage_log.condition_after = condition_after
        usage_log.issues_reported = issues_reported
        usage_log.save()
        
        booking.status = 'completed'
        booking.actual_end_time = now
        booking.save()
        
        # Update resource status if needed
        if issues_reported:
            booking.resource.status = 'maintenance'
            booking.resource.save()
        
        return Response(
            {'message': 'Checked out successfully.'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        now = timezone.now()
        queryset = self.get_queryset().filter(
            start_time__gt=now,
            status__in=['pending', 'approved']
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        now = timezone.now()
        queryset = self.get_queryset().filter(
            start_time__lte=now,
            end_time__gte=now,
            status__in=['approved', 'ongoing']
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)