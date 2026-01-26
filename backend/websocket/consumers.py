import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework.authtoken.models import Token
import jwt

User = get_user_model()

class BaseConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = await self.get_user()
        if self.user and self.user.is_authenticated:
            await self.accept()
            await self.add_to_groups()
        else:
            await self.close()

    async def disconnect(self, close_code):
        await self.remove_from_groups()

    async def get_user(self):
        token = None
        
        # Check query parameters
        token = self.scope.get('query_string').decode().split('token=')[-1]
        
        if not token:
            # Check headers
            headers = dict(self.scope['headers'])
            if b'authorization' in headers:
                auth_header = headers[b'authorization'].decode()
                if auth_header.startswith('Token '):
                    token = auth_header[6:]
        
        if token:
            try:
                # Try Token authentication
                token_obj = await database_sync_to_async(Token.objects.get)(key=token)
                return token_obj.user
            except Token.DoesNotExist:
                try:
                    # Try JWT authentication
                    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
                    user_id = payload.get('user_id')
                    if user_id:
                        return await database_sync_to_async(User.objects.get)(id=user_id)
                except (jwt.InvalidTokenError, User.DoesNotExist):
                    pass
        
        return AnonymousUser()

    async def add_to_groups(self):
        # User group
        await self.channel_layer.group_add(
            f'user_{self.user.id}',
            self.channel_name
        )
        
        # Global group for broadcasts
        await self.channel_layer.group_add(
            'global',
            self.channel_name
        )

    async def remove_from_groups(self):
        await self.channel_layer.group_discard(
            f'user_{self.user.id}',
            self.channel_name
        )
        await self.channel_layer.group_discard(
            'global',
            self.channel_name
        )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            event_type = data.get('type')
            
            if event_type == 'join_room':
                await self.handle_join_room(data)
            elif event_type == 'leave_room':
                await self.handle_leave_room(data)
            elif event_type == 'send_message':
                await self.handle_send_message(data)
            elif event_type == 'mark_read':
                await self.handle_mark_read(data)
            elif event_type == 'typing':
                await self.handle_typing(data)
            
        except json.JSONDecodeError:
            await self.send_error('Invalid JSON')

    async def send_error(self, message):
        await self.send(json.dumps({
            'type': 'error',
            'message': message
        }))

class NotificationConsumer(BaseConsumer):
    async def add_to_groups(self):
        await super().add_to_groups()
        
        # Add to notification groups based on user role
        if self.user.role == 'admin':
            await self.channel_layer.group_add(
                'admin_notifications',
                self.channel_name
            )
        elif self.user.role == 'organizer':
            await self.channel_layer.group_add(
                'organizer_notifications',
                self.channel_name
            )

    async def remove_from_groups(self):
        await super().remove_from_groups()
        
        if self.user.role == 'admin':
            await self.channel_layer.group_discard(
                'admin_notifications',
                self.channel_name
            )
        elif self.user.role == 'organizer':
            await self.channel_layer.group_discard(
                'organizer_notifications',
                self.channel_name
            )

    async def notification(self, event):
        """Send notification to user"""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'notification': event['notification']
        }))

    async def event_update(self, event):
        """Send event update notification"""
        await self.send(text_data=json.dumps({
            'type': 'event_update',
            'event': event['event']
        }))

    async def booking_update(self, event):
        """Send booking update notification"""
        await self.send(text_data=json.dumps({
            'type': 'booking_update',
            'booking': event['booking']
        }))

class MessageConsumer(BaseConsumer):
    async def add_to_groups(self):
        await super().add_to_groups()
        
        # Add to message groups
        await self.channel_layer.group_add(
            f'messages_user_{self.user.id}',
            self.channel_name
        )

    async def remove_from_groups(self):
        await super().remove_from_groups()
        await self.channel_layer.group_discard(
            f'messages_user_{self.user.id}',
            self.channel_name
        )

    async def handle_join_room(self, data):
        """Join a message thread room"""
        thread_id = data.get('room')
        if thread_id:
            await self.channel_layer.group_add(
                f'thread_{thread_id}',
                self.channel_name
            )

    async def handle_leave_room(self, data):
        """Leave a message thread room"""
        thread_id = data.get('room')
        if thread_id:
            await self.channel_layer.group_discard(
                f'thread_{thread_id}',
                self.channel_name
            )

    async def handle_send_message(self, data):
        """Handle sending a message"""
        from messaging.models import MessageThread, Message
        from messaging.serializers import MessageSerializer
        
        thread_id = data.get('thread_id')
        content = data.get('content')
        attachments = data.get('attachments', [])
        
        try:
            # Get thread
            thread = await database_sync_to_async(MessageThread.objects.get)(
                id=thread_id,
                participants=self.user
            )
            
            # Create message
            message = await database_sync_to_async(Message.objects.create)(
                thread=thread,
                sender=self.user,
                content=content,
                message_type='text',
                attachments=attachments
            )
            
            # Serialize message
            serializer = MessageSerializer(message)
            message_data = serializer.data
            
            # Send to thread participants
            await self.channel_layer.group_send(
                f'thread_{thread_id}',
                {
                    'type': 'message',
                    'message': message_data
                }
            )
            
            # Send typing stopped event
            await self.channel_layer.group_send(
                f'thread_{thread_id}',
                {
                    'type': 'typing',
                    'user_id': str(self.user.id),
                    'is_typing': False
                }
            )
            
        except MessageThread.DoesNotExist:
            await self.send_error('Thread not found or access denied')

    async def handle_mark_read(self, data):
        """Handle marking message as read"""
        message_id = data.get('message_id')
        
        from messaging.models import Message
        try:
            message = await database_sync_to_async(Message.objects.get)(
                id=message_id,
                thread__participants=self.user
            )
            
            await database_sync_to_async(message.mark_as_read)(self.user)
            
            # Notify thread participants
            await self.channel_layer.group_send(
                f'thread_{message.thread.id}',
                {
                    'type': 'message_read',
                    'message_id': message_id,
                    'user_id': str(self.user.id)
                }
            )
            
        except Message.DoesNotExist:
            await self.send_error('Message not found')

    async def handle_typing(self, data):
        """Handle typing indicator"""
        thread_id = data.get('thread_id')
        is_typing = data.get('is_typing')
        
        # Broadcast typing status to thread (except sender)
        await self.channel_layer.group_send(
            f'thread_{thread_id}',
            {
                'type': 'typing',
                'user_id': str(self.user.id),
                'is_typing': is_typing
            }
        )

    async def message(self, event):
        """Receive a message"""
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message': event['message']
        }))

    async def message_read(self, event):
        """Receive message read receipt"""
        await self.send(text_data=json.dumps({
            'type': 'message_read',
            'message_id': event['message_id'],
            'user_id': event['user_id']
        }))

    async def typing(self, event):
        """Receive typing indicator"""
        # Don't send typing indicator to the user who is typing
        if event['user_id'] != str(self.user.id):
            await self.send(text_data=json.dumps({
                'type': 'typing',
                'user_id': event['user_id'],
                'is_typing': event['is_typing']
            }))