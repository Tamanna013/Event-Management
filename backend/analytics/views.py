from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta, datetime
from django.db.models import Count, Sum, Avg, Q, F
from django.db.models.functions import TruncDate

from .models import AnalyticsSnapshot, ClubAnalytics, UserActivity
from .serializers import (
    AnalyticsSnapshotSerializer, ClubAnalyticsSerializer,
    UserActivitySerializer, DateRangeSerializer
)
from users.models import User, ClubMembership
from clubs.models import Club
from events.models import Event, EventRegistration, EventFeedback
from resources.models import Resource, ResourceBooking
from users.permissions import IsAdmin

class AnalyticsViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAdmin]
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get high-level dashboard statistics"""
        now = timezone.now()
        
        # User Statistics
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        new_users_today = User.objects.filter(
            created_at__date=now.date()
        ).count()
        
        # Club Statistics
        total_clubs = Club.objects.count()
        active_clubs = Club.objects.filter(status='active').count()
        pending_clubs = Club.objects.filter(status='pending').count()
        
        # Event Statistics
        total_events = Event.objects.count()
        upcoming_events = Event.objects.filter(
            start_datetime__gt=now,
            status='approved'
        ).count()
        ongoing_events = Event.objects.filter(
            start_datetime__lte=now,
            end_datetime__gte=now,
            status='approved'
        ).count()
        
        # Resource Statistics
        total_resources = Resource.objects.count()
        available_resources = Resource.objects.filter(status='available').count()
        today_bookings = ResourceBooking.objects.filter(
            start_time__date=now.date()
        ).count()
        
        # Registration Statistics
        total_registrations = EventRegistration.objects.filter(
            status__in=['registered', 'attended']
        ).count()
        
        # Recent Activity
        recent_users = User.objects.order_by('-date_joined')[:5]
        recent_events = Event.objects.order_by('-created_at')[:5]
        recent_clubs = Club.objects.order_by('-created_at')[:5]
        
        dashboard_data = {
            'users': {
                'total': total_users,
                'active': active_users,
                'new_today': new_users_today,
                'by_role': {
                    'admin': User.objects.filter(role='admin').count(),
                    'organizer': User.objects.filter(role='organizer').count(),
                    'participant': User.objects.filter(role='participant').count(),
                }
            },
            'clubs': {
                'total': total_clubs,
                'active': active_clubs,
                'pending': pending_clubs,
                'by_type': dict(Club.objects.values_list('club_type').annotate(count=Count('id')))
            },
            'events': {
                'total': total_events,
                'upcoming': upcoming_events,
                'ongoing': ongoing_events,
                'by_type': dict(Event.objects.values_list('event_type').annotate(count=Count('id')))
            },
            'resources': {
                'total': total_resources,
                'available': available_resources,
                'bookings_today': today_bookings,
                'utilization': self.calculate_resource_utilization()
            },
            'registrations': {
                'total': total_registrations,
                'avg_per_event': self.calculate_avg_registrations()
            },
            'recent_activity': {
                'users': [
                    {'id': str(u.id), 'email': u.email, 'name': u.get_full_name()}
                    for u in recent_users
                ],
                'events': [
                    {'id': str(e.id), 'title': e.title, 'status': e.status}
                    for e in recent_events
                ],
                'clubs': [
                    {'id': str(c.id), 'name': c.name, 'status': c.status}
                    for c in recent_clubs
                ]
            }
        }
        
        return Response(dashboard_data)
    
    @action(detail=False, methods=['get'])
    def trends(self, request):
        """Get trends over time"""
        serializer = DateRangeSerializer(data=request.query_params)
        if serializer.is_valid():
            start_date = serializer.validated_data.get('start_date')
            end_date = serializer.validated_data.get('end_date')
            
            if not start_date:
                start_date = timezone.now().date() - timedelta(days=30)
            if not end_date:
                end_date = timezone.now().date()
            
            # Convert to datetime for querying
            start_datetime = timezone.make_aware(datetime.combine(start_date, datetime.min.time()))
            end_datetime = timezone.make_aware(datetime.combine(end_date, datetime.max.time()))
            
            # User trends
            user_trends = User.objects.filter(
                created_at__range=[start_datetime, end_datetime]
            ).annotate(
                date=TruncDate('created_at')
            ).values('date').annotate(
                count=Count('id')
            ).order_by('date')
            
            # Event trends
            event_trends = Event.objects.filter(
                created_at__range=[start_datetime, end_datetime]
            ).annotate(
                date=TruncDate('created_at')
            ).values('date').annotate(
                count=Count('id')
            ).order_by('date')
            
            # Registration trends
            registration_trends = EventRegistration.objects.filter(
                registered_at__range=[start_datetime, end_datetime]
            ).annotate(
                date=TruncDate('registered_at')
            ).values('date').annotate(
                count=Count('id')
            ).order_by('date')
            
            # Booking trends
            booking_trends = ResourceBooking.objects.filter(
                created_at__range=[start_datetime, end_datetime]
            ).annotate(
                date=TruncDate('created_at')
            ).values('date').annotate(
                count=Count('id')
            ).order_by('date')
            
            trends_data = {
                'users': list(user_trends),
                'events': list(event_trends),
                'registrations': list(registration_trends),
                'bookings': list(booking_trends),
                'date_range': {
                    'start': start_date,
                    'end': end_date
                }
            }
            
            return Response(trends_data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def club_performance(self, request):
        """Get performance metrics for all clubs"""
        clubs = Club.objects.filter(status='active')
        
        performance_data = []
        for club in clubs:
            # Get club stats
            members_count = ClubMembership.objects.filter(
                club=club,
                role__in=['head', 'coordinator', 'member']
            ).count()
            
            events_count = Event.objects.filter(
                Q(primary_club=club) | Q(organizing_clubs=club)
            ).distinct().count()
            
            registrations_count = EventRegistration.objects.filter(
                event__primary_club=club,
                status__in=['registered', 'attended']
            ).count()
            
            budget_used = Event.objects.filter(
                primary_club=club
            ).aggregate(total=Sum('budget_used'))['total'] or 0
            
            avg_rating = EventFeedback.objects.filter(
                event__primary_club=club
            ).aggregate(avg=Avg('rating'))['avg'] or 0
            
            performance_data.append({
                'club': {
                    'id': str(club.id),
                    'name': club.name,
                    'type': club.club_type
                },
                'members': members_count,
                'events': events_count,
                'registrations': registrations_count,
                'budget_used': float(budget_used),
                'avg_rating': float(avg_rating),
                'engagement_score': self.calculate_club_engagement(club)
            })
        
        # Sort by engagement score
        performance_data.sort(key=lambda x: x['engagement_score'], reverse=True)
        
        return Response(performance_data)
    
    @action(detail=False, methods=['get'])
    def resource_utilization(self, request):
        """Get resource utilization analytics"""
        resources = Resource.objects.all()
        
        utilization_data = []
        for resource in resources:
            # Calculate booked hours in last 30 days
            thirty_days_ago = timezone.now() - timedelta(days=30)
            bookings = ResourceBooking.objects.filter(
                resource=resource,
                start_time__gte=thirty_days_ago,
                status__in=['approved', 'confirmed', 'ongoing', 'completed']
            )
            
            total_booked_hours = sum(b.duration_hours for b in bookings)
            total_possible_hours = 24 * 30  # 24 hours * 30 days
            
            utilization_rate = (total_booked_hours / total_possible_hours * 100) if total_possible_hours > 0 else 0
            
            utilization_data.append({
                'resource': {
                    'id': str(resource.id),
                    'name': resource.name,
                    'type': resource.resource_type
                },
                'total_bookings': bookings.count(),
                'booked_hours': total_booked_hours,
                'utilization_rate': round(utilization_rate, 2),
                'status': resource.status
            })
        
        # Sort by utilization rate
        utilization_data.sort(key=lambda x: x['utilization_rate'], reverse=True)
        
        return Response(utilization_data)
    
    @action(detail=False, methods=['get'])
    def export(self, request):
        """Export analytics data in CSV/Excel format"""
        from django.http import HttpResponse
        import csv
        
        export_type = request.query_params.get('type', 'csv')
        data_type = request.query_params.get('data', 'users')
        
        response = HttpResponse(content_type='text/csv' if export_type == 'csv' else 'application/vnd.ms-excel')
        
        if export_type == 'csv':
            response['Content-Disposition'] = f'attachment; filename="{data_type}_analytics.csv"'
            writer = csv.writer(response)
            
            if data_type == 'users':
                writer.writerow(['ID', 'Email', 'Name', 'Role', 'Department', 'Joined Date', 'Last Login'])
                for user in User.objects.all():
                    writer.writerow([
                        str(user.id),
                        user.email,
                        user.get_full_name(),
                        user.role,
                        user.department,
                        user.date_joined,
                        user.last_login
                    ])
            
            elif data_type == 'events':
                writer.writerow(['ID', 'Title', 'Type', 'Status', 'Start Date', 'End Date', 'Location', 'Registrations'])
                for event in Event.objects.all():
                    registrations = event.registrations.filter(status__in=['registered', 'attended']).count()
                    writer.writerow([
                        str(event.id),
                        event.title,
                        event.event_type,
                        event.status,
                        event.start_datetime,
                        event.end_datetime,
                        event.location,
                        registrations
                    ])
            
            elif data_type == 'bookings':
                writer.writerow(['ID', 'Resource', 'User', 'Purpose', 'Start Time', 'End Time', 'Status'])
                for booking in ResourceBooking.objects.all():
                    writer.writerow([
                        str(booking.id),
                        booking.resource.name,
                        booking.user.email,
                        booking.purpose,
                        booking.start_time,
                        booking.end_time,
                        booking.status
                    ])
        
        return response
    
    def calculate_resource_utilization(self):
        """Calculate overall resource utilization percentage"""
        total_resources = Resource.objects.count()
        if total_resources == 0:
            return 0
        
        thirty_days_ago = timezone.now() - timedelta(days=30)
        bookings = ResourceBooking.objects.filter(
            start_time__gte=thirty_days_ago,
            status__in=['approved', 'confirmed', 'ongoing', 'completed']
        )
        
        total_booked_hours = sum(b.duration_hours for b in bookings)
        total_possible_hours = total_resources * 24 * 30
        
        return round((total_booked_hours / total_possible_hours * 100), 2) if total_possible_hours > 0 else 0
    
    def calculate_avg_registrations(self):
        """Calculate average registrations per event"""
        events_with_reg = Event.objects.annotate(
            reg_count=Count('registrations', filter=Q(registrations__status__in=['registered', 'attended']))
        ).filter(reg_count__gt=0)
        
        if events_with_reg.exists():
            return round(events_with_reg.aggregate(avg=Avg('reg_count'))['avg'], 2)
        return 0
    
    def calculate_club_engagement(self, club):
        """Calculate engagement score for a club (0-100)"""
        score = 0
        
        # Member count (max 30 points)
        members = ClubMembership.objects.filter(
            club=club,
            role__in=['head', 'coordinator', 'member']
        ).count()
        score += min(members / 10, 30)  # 10 members = 30 points
        
        # Event activity (max 30 points)
        events_count = Event.objects.filter(
            Q(primary_club=club) | Q(organizing_clubs=club)
        ).distinct().count()
        score += min(events_count * 3, 30)  # 10 events = 30 points
        
        # Registration rate (max 20 points)
        total_capacity = Event.objects.filter(
            primary_club=club
        ).aggregate(total=Sum('max_participants'))['total'] or 0
        
        if total_capacity > 0:
            total_registrations = EventRegistration.objects.filter(
                event__primary_club=club,
                status__in=['registered', 'attended']
            ).count()
            fill_rate = (total_registrations / total_capacity) * 100
            score += min(fill_rate / 5, 20)  # 100% fill = 20 points
        
        # Feedback rating (max 20 points)
        avg_rating = EventFeedback.objects.filter(
            event__primary_club=club
        ).aggregate(avg=Avg('rating'))['avg'] or 0
        score += avg_rating * 4  # 5 stars = 20 points
        
        return min(score, 100)