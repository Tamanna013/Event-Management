from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q, Count, Max

from .models import MessageThread, Message, MessageReadReceipt, MessageReaction
from .serializers import (
    MessageThreadSerializer, CreateMessageThreadSerializer,
    MessageSerializer, CreateMessageSerializer, MessageReactionSerializer
)

class MessageThreadViewSet(viewsets.ModelViewSet):
    serializer_class = MessageThreadSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateMessageThreadSerializer
        return super().get_serializer_class()
    
    def get_queryset(self):
        user = self.request.user
        
        # Get threads where user is a participant
        queryset = MessageThread.objects.filter(
            participants=user,
            is_active=True
        ).annotate(
            last_message_time=Max('messages__created_at')
        ).order_by('-last_message_time')
        
        # Filter by thread type if provided
        thread_type = self.request.query_params.get('type')
        if thread_type:
            queryset = queryset.filter(thread_type=thread_type)
        
        # Filter by club if provided
        club_id = self.request.query_params.get('club_id')
        if club_id:
            queryset = queryset.filter(club_id=club_id)
        
        # Filter by event if provided
        event_id = self.request.query_params.get('event_id')
        if event_id:
            queryset = queryset.filter(event_id=event_id)
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            thread = serializer.save()
            return Response(
                MessageThreadSerializer(thread, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def add_participant(self, request, pk=None):
        thread = self.get_object()
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'User ID is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from users.models import User
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user is already a participant
        if thread.participants.filter(id=user_id).exists():
            return Response(
                {'error': 'User is already a participant.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        thread.participants.add(user)
        
        # Send system message
        system_message = Message.objects.create(
            thread=thread,
            sender=request.user,
            content=f'{request.user.get_full_name()} added {user.get_full_name()} to the conversation.',
            message_type='system'
        )
        
        return Response(
            {'message': 'Participant added successfully.'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def remove_participant(self, request, pk=None):
        thread = self.get_object()
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'User ID is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Cannot remove yourself if you're the only participant
        if str(request.user.id) == user_id and thread.participants.count() <= 1:
            return Response(
                {'error': 'Cannot remove yourself as the only participant.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from users.models import User
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        thread.participants.remove(user)
        
        # Send system message
        system_message = Message.objects.create(
            thread=thread,
            sender=request.user,
            content=f'{request.user.get_full_name()} removed {user.get_full_name()} from the conversation.',
            message_type='system'
        )
        
        return Response(
            {'message': 'Participant removed successfully.'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        thread = self.get_object()
        
        # Cannot leave if you're the only participant
        if thread.participants.count() <= 1:
            return Response(
                {'error': 'Cannot leave as the only participant.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        thread.participants.remove(request.user)
        
        # Send system message
        system_message = Message.objects.create(
            thread=thread,
            sender=request.user,
            content=f'{request.user.get_full_name()} left the conversation.',
            message_type='system'
        )
        
        return Response(
            {'message': 'Successfully left the conversation.'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        thread = self.get_object()
        
        # Check if user is a participant
        if not thread.participants.filter(id=request.user.id).exists():
            return Response(
                {'error': 'You are not a participant in this thread.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        messages = thread.messages.filter(is_deleted=False).order_by('created_at')
        
        # Mark messages as read
        unread_messages = messages.filter(is_read=False).exclude(sender=request.user)
        for message in unread_messages:
            message.mark_as_read(request.user)
        
        page = self.paginate_queryset(messages)
        if page is not None:
            serializer = MessageSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateMessageSerializer
        return super().get_serializer_class()
    
    def get_queryset(self):
        user = self.request.user
        
        # Get messages from threads where user is a participant
        return Message.objects.filter(
            thread__participants=user,
            is_deleted=False
        ).order_by('-created_at')
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            # Pass thread_id from URL to serializer context
            serializer.context['thread_id'] = self.kwargs.get('thread_id')
            
            message = serializer.save()
            return Response(
                MessageSerializer(message, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def react(self, request, pk=None):
        message = self.get_object()
        reaction_type = request.data.get('reaction_type')
        
        if not reaction_type:
            return Response(
                {'error': 'Reaction type is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if valid reaction type
        valid_types = [choice[0] for choice in MessageReaction.REACTION_TYPES]
        if reaction_type not in valid_types:
            return Response(
                {'error': 'Invalid reaction type.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user already reacted with this type
        existing_reaction = MessageReaction.objects.filter(
            message=message,
            user=request.user,
            reaction_type=reaction_type
        ).first()
        
        if existing_reaction:
            # Remove reaction if already exists (toggle)
            existing_reaction.delete()
            action = 'removed'
        else:
            # Add reaction
            MessageReaction.objects.create(
                message=message,
                user=request.user,
                reaction_type=reaction_type
            )
            action = 'added'
        
        return Response({
            'message': f'Reaction {action} successfully.',
            'reaction_type': reaction_type,
            'action': action
        })
    
    @action(detail=True, methods=['post'])
    def delete(self, request, pk=None):
        message = self.get_object()
        
        # Only sender can delete their message
        if message.sender != request.user:
            return Response(
                {'error': 'You can only delete your own messages.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        message.is_deleted = True
        message.save()
        
        return Response(
            {'message': 'Message deleted successfully.'},
            status=status.HTTP_200_OK
        )