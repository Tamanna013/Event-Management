from rest_framework import serializers
from .models import MessageThread, Message, MessageReadReceipt, MessageReaction
from users.serializers import UserProfileSerializer
from clubs.serializers import ClubSerializer
from events.serializers import EventSerializer

class MessageThreadSerializer(serializers.ModelSerializer):
    participants = UserProfileSerializer(many=True, read_only=True)
    created_by = UserProfileSerializer(read_only=True)
    event = EventSerializer(read_only=True)
    club = ClubSerializer(read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = MessageThread
        fields = [
            'id', 'thread_type', 'name', 'description', 'participants',
            'event', 'club', 'created_by', 'created_at', 'updated_at',
            'is_active', 'last_message', 'unread_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_last_message(self, obj):
        last_message = obj.last_message
        if last_message:
            return {
                'content': last_message.content[:100],
                'sender': UserProfileSerializer(last_message.sender).data,
                'created_at': last_message.created_at,
                'message_type': last_message.message_type
            }
        return None
    
    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0

class CreateMessageThreadSerializer(serializers.ModelSerializer):
    participant_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = MessageThread
        fields = ['thread_type', 'name', 'description', 'event', 'club', 'participant_ids']
    
    def create(self, validated_data):
        request = self.context.get('request')
        participant_ids = validated_data.pop('participant_ids', [])
        
        # Add creator to participants
        participant_ids.append(request.user.id)
        
        thread = MessageThread.objects.create(
            **validated_data,
            created_by=request.user
        )
        
        # Add participants
        from users.models import User
        participants = User.objects.filter(id__in=participant_ids)
        thread.participants.set(participants)
        
        return thread

class MessageSerializer(serializers.ModelSerializer):
    sender = UserProfileSerializer(read_only=True)
    thread = MessageThreadSerializer(read_only=True)
    reactions = serializers.SerializerMethodField()
    read_receipts = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = [
            'id', 'thread', 'sender', 'content', 'message_type',
            'attachments', 'is_read', 'is_deleted', 'reactions',
            'read_receipts', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_reactions(self, obj):
        reactions = {}
        for reaction in obj.reactions.all():
            if reaction.reaction_type not in reactions:
                reactions[reaction.reaction_type] = []
            reactions[reaction.reaction_type].append(
                UserProfileSerializer(reaction.user).data
            )
        return reactions
    
    def get_read_receipts(self, obj):
        receipts = obj.messagereadreceipt_set.all()
        return [
            {
                'user': UserProfileSerializer(receipt.user).data,
                'read_at': receipt.read_at
            }
            for receipt in receipts
        ]

class CreateMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['content', 'message_type', 'attachments']
    
    def create(self, validated_data):
        request = self.context.get('request')
        thread_id = self.context.get('thread_id')
        
        try:
            thread = MessageThread.objects.get(id=thread_id)
        except MessageThread.DoesNotExist:
            raise serializers.ValidationError("Thread does not exist.")
        
        # Check if user is a participant
        if not thread.participants.filter(id=request.user.id).exists():
            raise serializers.ValidationError("You are not a participant in this thread.")
        
        message = Message.objects.create(
            thread=thread,
            sender=request.user,
            **validated_data
        )
        
        # Update thread's updated_at
        thread.save()  # This triggers auto_now
        
        return message

class MessageReactionSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)
    message = MessageSerializer(read_only=True)
    
    class Meta:
        model = MessageReaction
        fields = ['id', 'message', 'user', 'reaction_type', 'created_at']
        read_only_fields = ['id', 'created_at']