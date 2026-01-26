from django.utils import timezone
from datetime import timedelta
from .models import Notification, NotificationPreference
from users.models import User
from events.models import Event, EventRegistration
from clubs.models import ClubInvitation, Club
from resources.models import ResourceBooking
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    @staticmethod
    def send_notification(recipient, notification_type, title, message, data=None, 
                         related_object=None, priority='medium', expires_in_hours=24):
        """
        Create and send a notification to a user.
        """
        try:
            # Check user preferences
            if not NotificationService.should_send_notification(recipient, notification_type):
                logger.debug(f"Notification blocked by user preference: {recipient.email} - {notification_type}")
                return None
            
            # Create notification
            notification_data = {
                'recipient': recipient,
                'notification_type': notification_type,
                'title': title,
                'message': message,
                'priority': priority,
                'data': data or {},
            }
            
            # Add related object
            if related_object:
                if isinstance(related_object, Event):
                    notification_data['event'] = related_object
                elif isinstance(related_object, Club):
                    notification_data['club'] = related_object
                elif isinstance(related_object, ResourceBooking):
                    notification_data['resource_booking'] = related_object
            
            # Set expiry
            if expires_in_hours:
                notification_data['expires_at'] = timezone.now() + timedelta(hours=expires_in_hours)
            
            notification = Notification.objects.create(**notification_data)
            
            # Send via enabled channels
            NotificationService.send_via_channels(recipient, notification_type, notification)
            
            return notification
            
        except Exception as e:
            logger.error(f"Error sending notification: {e}")
            return None
    
    @staticmethod
    def should_send_notification(user, notification_type):
        """
        Check if user wants to receive this type of notification via any channel.
        """
        preferences = NotificationPreference.objects.filter(
            user=user,
            notification_type=notification_type,
            is_enabled=True
        )
        return preferences.exists()
    
    @staticmethod
    def send_via_channels(user, notification_type, notification):
        """
        Send notification through all enabled channels for the user.
        """
        preferences = NotificationPreference.objects.filter(
            user=user,
            notification_type=notification_type,
            is_enabled=True
        )
        
        for preference in preferences:
            try:
                if preference.channel == 'email':
                    NotificationService.send_email_notification(user, notification)
                elif preference.channel == 'push':
                    NotificationService.send_push_notification(user, notification)
                elif preference.channel == 'in_app':
                    # In-app notifications are already created
                    pass
                elif preference.channel == 'sms':
                    NotificationService.send_sms_notification(user, notification)
                
                notification.is_sent = True
                notification.sent_at = timezone.now()
                notification.save()
                
            except Exception as e:
                logger.error(f"Error sending {preference.channel} notification: {e}")
    
    @staticmethod
    def send_email_notification(user, notification):
        """
        Send email notification.
        TODO: Implement email sending
        """
        # This is a placeholder - implement your email sending logic here
        logger.info(f"Would send email to {user.email}: {notification.title}")
    
    @staticmethod
    def send_push_notification(user, notification):
        """
        Send push notification.
        TODO: Implement push notification service
        """
        logger.info(f"Would send push notification to {user.email}: {notification.title}")
    
    @staticmethod
    def send_sms_notification(user, notification):
        """
        Send SMS notification.
        TODO: Implement SMS service
        """
        logger.info(f"Would send SMS to {user.phone_number}: {notification.title}")
    
    # Event-related notifications
    @staticmethod
    def notify_event_approval(event):
        """Notify event creator about approval"""
        NotificationService.send_notification(
            recipient=event.created_by,
            notification_type='event_approval',
            title='Event Approved',
            message=f'Your event "{event.title}" has been approved.',
            related_object=event,
            priority='medium'
        )
    
    @staticmethod
    def notify_event_rejection(event, reason):
        """Notify event creator about rejection"""
        NotificationService.send_notification(
            recipient=event.created_by,
            notification_type='event_approval',
            title='Event Rejected',
            message=f'Your event "{event.title}" has been rejected. Reason: {reason}',
            data={'rejection_reason': reason},
            related_object=event,
            priority='medium'
        )
    
    @staticmethod
    def notify_event_registration(user, event):
        """Notify user about successful event registration"""
        NotificationService.send_notification(
            recipient=user,
            notification_type='event_registration',
            title='Event Registration Confirmed',
            message=f'You have successfully registered for "{event.title}".',
            related_object=event,
            priority='low'
        )
    
    @staticmethod
    def send_event_reminders():
        """Send reminders for upcoming events (to be called by a scheduled task)"""
        from datetime import timedelta
        
        reminder_time = timezone.now() + timedelta(hours=1)
        upcoming_events = Event.objects.filter(
            start_datetime__range=[timezone.now(), reminder_time],
            status='approved'
        )
        
        for event in upcoming_events:
            # Notify organizers
            organizers = [event.created_by]
            for collaborator in event.collaborators.filter(role__in=['organizer', 'coordinator']):
                organizers.append(collaborator.user)
            
            for organizer in set(organizers):
                NotificationService.send_notification(
                    recipient=organizer,
                    notification_type='event_reminder',
                    title='Upcoming Event',
                    message=f'Event "{event.title}" starts in 1 hour.',
                    related_object=event,
                    priority='medium',
                    expires_in_hours=2
                )
            
            # Notify registered participants
            registrations = EventRegistration.objects.filter(
                event=event,
                status__in=['registered', 'attended']
            )
            
            for registration in registrations:
                NotificationService.send_notification(
                    recipient=registration.user,
                    notification_type='event_reminder',
                    title='Upcoming Event Reminder',
                    message=f'Event "{event.title}" starts in 1 hour.',
                    related_object=event,
                    priority='medium',
                    expires_in_hours=2
                )
    
    # Club-related notifications
    @staticmethod
    def notify_club_invitation(invitation):
        """Notify user about club invitation"""
        NotificationService.send_notification(
            recipient=invitation.invited_by,
            notification_type='club_invitation',
            title='Club Invitation Sent',
            message=f'Invitation sent to {invitation.email} for {invitation.club.name}.',
            related_object=invitation.club,
            priority='low'
        )
    
    @staticmethod
    def notify_club_approval(club):
        """Notify club creator about approval"""
        NotificationService.send_notification(
            recipient=club.created_by,
            notification_type='club_approval',
            title='Club Approved',
            message=f'Your club "{club.name}" has been approved and is now active.',
            related_object=club,
            priority='medium'
        )
    
    # Resource-related notifications
    @staticmethod
    def notify_booking_approval(booking):
        """Notify user about booking approval"""
        NotificationService.send_notification(
            recipient=booking.user,
            notification_type='booking_approval',
            title='Booking Approved',
            message=f'Your booking for {booking.resource.name} has been approved.',
            related_object=booking,
            priority='medium'
        )
    
    @staticmethod
    def notify_booking_rejection(booking, reason):
        """Notify user about booking rejection"""
        NotificationService.send_notification(
            recipient=booking.user,
            notification_type='booking_approval',
            title='Booking Rejected',
            message=f'Your booking for {booking.resource.name} has been rejected. Reason: {reason}',
            data={'rejection_reason': reason},
            related_object=booking,
            priority='medium'
        )
    
    @staticmethod
    def send_booking_reminders():
        """Send reminders for upcoming bookings (to be called by a scheduled task)"""
        from datetime import timedelta
        
        reminder_time = timezone.now() + timedelta(minutes=30)
        upcoming_bookings = ResourceBooking.objects.filter(
            start_time__range=[timezone.now(), reminder_time],
            status='approved'
        )
        
        for booking in upcoming_bookings:
            NotificationService.send_notification(
                recipient=booking.user,
                notification_type='booking_reminder',
                title='Upcoming Booking',
                message=f'Your booking for {booking.resource.name} starts in 30 minutes.',
                related_object=booking,
                priority='medium',
                expires_in_hours=1
            )