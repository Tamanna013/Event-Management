from rest_framework import serializers
from .models import User, OTP, ClubMembership
from django.contrib.auth import authenticate
from django.utils import timezone
from datetime import timedelta
import random
import string

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'confirm_password', 
                 'first_name', 'last_name', 'department', 'year', 'phone_number']
    
    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        
        # Check if email already exists
        if User.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError({"email": "A user with this email already exists."})
        
        # Check if username already exists
        if User.objects.filter(username=data['username']).exists():
            raise serializers.ValidationError({"username": "A user with this username already exists."})
        
        return data
    
    def create(self, validated_data):
        validated_data.pop('confirm_password')
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            department=validated_data.get('department'),
            year=validated_data.get('year'),
            phone_number=validated_data.get('phone_number'),
            is_active=True
        )
        return user

class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        email = data.get('email')
        password = data.get('password')
        
        if email and password:
            user = authenticate(username=email, password=password)
            if user:
                if not user.is_active:
                    raise serializers.ValidationError("User account is disabled.")
                data['user'] = user
            else:
                raise serializers.ValidationError("Unable to log in with provided credentials.")
        else:
            raise serializers.ValidationError("Must include 'email' and 'password'.")
        
        return data

class UserProfileSerializer(serializers.ModelSerializer):
    club_memberships = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 
                 'department', 'year', 'role', 'phone_number', 'profile_picture',
                 'bio', 'show_email', 'show_phone', 'show_department',
                 'club_memberships', 'created_at', 'updated_at']
        read_only_fields = ['id', 'email', 'role', 'created_at', 'updated_at']
    
    def get_club_memberships(self, obj):
        memberships = ClubMembership.objects.filter(user=obj)
        from clubs.serializers import ClubMembershipSerializer
        return ClubMembershipSerializer(memberships, many=True).data

class OTPRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
    purpose = serializers.ChoiceField(choices=['password_reset', 'login'])
    
    def validate_email(self, value):
        try:
            User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User with this email does not exist.")
        return value
    
    def validate(self, data):
        user = User.objects.get(email=data['email'])
        
        # Prevent too many OTP requests
        recent_otps = OTP.objects.filter(
            user=user,
            purpose=data['purpose'],
            created_at__gte=timezone.now() - timedelta(minutes=2)
        )
        if recent_otps.exists():
            raise serializers.ValidationError("Please wait before requesting another OTP.")
        
        return data

class OTPVerifySerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6)
    purpose = serializers.ChoiceField(choices=['password_reset', 'login'])
    
    def validate(self, data):
        try:
            user = User.objects.get(email=data['email'])
            otp = OTP.objects.filter(
                user=user,
                otp_code=data['otp_code'],
                purpose=data['purpose'],
                is_used=False
            ).latest('created_at')
            
            if not otp.is_valid():
                raise serializers.ValidationError("OTP has expired or is invalid.")
            
            data['otp'] = otp
            data['user'] = user
            
        except (User.DoesNotExist, OTP.DoesNotExist):
            raise serializers.ValidationError("Invalid OTP or email.")
        
        return data

class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6)
    new_password = serializers.CharField(min_length=6, write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        
        # Verify OTP
        try:
            user = User.objects.get(email=data['email'])
            otp = OTP.objects.filter(
                user=user,
                otp_code=data['otp_code'],
                purpose='password_reset',
                is_used=False
            ).latest('created_at')
            
            if not otp.is_valid():
                raise serializers.ValidationError("OTP has expired or is invalid.")
            
            data['otp'] = otp
            data['user'] = user
            
        except (User.DoesNotExist, OTP.DoesNotExist):
            raise serializers.ValidationError("Invalid OTP or email.")
        
        return data

class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'department', 'year', 
                 'phone_number', 'profile_picture', 'bio',
                 'show_email', 'show_phone', 'show_department']
        extra_kwargs = {
            'profile_picture': {'required': False, 'allow_null': True},
            'bio': {'required': False, 'allow_null': True},
        }