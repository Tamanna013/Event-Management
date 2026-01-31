# users/serializers.py
from rest_framework import serializers
from .models import User, OTP, ClubMembership

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'department', 'year', 'phone_number']
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        email = data.get('email')
        password = data.get('password')
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError('Invalid email or password.')
        
        if not user.check_password(password):
            raise serializers.ValidationError('Invalid email or password.')
        
        if not user.is_active:
            raise serializers.ValidationError('User account is disabled.')
        
        data['user'] = user
        return data

# Fix: Remove any imports that might cause circular reference
# If you need ClubSerializer, import it inside the method or use a string reference

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'department', 'year', 'role', 
                 'phone_number', 'profile_picture', 'bio', 'is_active', 
                 'created_at', 'show_email', 'show_phone', 'show_department']
        read_only_fields = ['id', 'created_at', 'is_active']

class UserProfileSerializer(serializers.ModelSerializer):
    # Use string reference to avoid circular import
    club_memberships = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'department', 'year', 'role', 
                 'phone_number', 'profile_picture', 'bio', 
                 'show_email', 'show_phone', 'show_department',
                 'club_memberships']
        read_only_fields = ['id', 'email', 'role']

class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'department', 'year', 'phone_number', 
                 'profile_picture', 'bio', 'show_email', 'show_phone', 
                 'show_department']

class OTPRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()
    purpose = serializers.ChoiceField(choices=['login', 'password_reset'])

class OTPVerifySerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6)
    purpose = serializers.ChoiceField(choices=['login', 'password_reset'])
    
    def validate(self, data):
        email = data.get('email')
        otp_code = data.get('otp_code')
        purpose = data.get('purpose')
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError('User not found.')
        
        try:
            otp = OTP.objects.get(
                user=user, 
                otp_code=otp_code,
                purpose=purpose,
                is_used=False,
                expires_at__gte=serializers.DateTimeField().to_internal_value(timezone.now())
            )
        except OTP.DoesNotExist:
            raise serializers.ValidationError('Invalid or expired OTP.')
        
        data['user'] = user
        data['otp'] = otp
        return data

class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6)
    new_password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        email = data.get('email')
        otp_code = data.get('otp_code')
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError('User not found.')
        
        try:
            otp = OTP.objects.get(
                user=user, 
                otp_code=otp_code,
                purpose='password_reset',
                is_used=False,
                expires_at__gte=serializers.DateTimeField().to_internal_value(timezone.now())
            )
        except OTP.DoesNotExist:
            raise serializers.ValidationError('Invalid or expired OTP.')
        
        data['user'] = user
        data['otp'] = otp
        return data