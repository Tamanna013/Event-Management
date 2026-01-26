from rest_framework import status, viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from datetime import timedelta
import random
import string

from .models import User, OTP, ClubMembership, UserActivityLog
from .serializers import (
    UserRegistrationSerializer, UserLoginSerializer, 
    UserProfileSerializer, OTPRequestSerializer,
    OTPVerifySerializer, PasswordResetSerializer,
    UserUpdateSerializer
)
from .permissions import IsAdmin, IsOrganizer

class AuthViewSet(viewsets.GenericViewSet):
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def register(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Create token for auto-login
            token, created = Token.objects.get_or_create(user=user)
            
            # Create activity log
            UserActivityLog.objects.create(
                user=user,
                action='USER_REGISTERED',
                details={
                    'method': 'email',
                    'username': user.username,
                    'department': user.department
                },
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            return Response({
                'message': 'Registration successful.',
                'token': token.key,
                'user': UserProfileSerializer(user).data,
                'user_id': str(user.id)
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def request_otp(self, request):
        serializer = OTPRequestSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            purpose = serializer.validated_data['purpose']
            
            user = User.objects.get(email=email)
            
            # Generate OTP
            otp_code = ''.join(random.choices(string.digits, k=6))
            expires_at = timezone.now() + timedelta(minutes=10)
            
            # Create OTP
            otp = OTP.objects.create(
                user=user,
                otp_code=otp_code,
                purpose=purpose,
                expires_at=expires_at
            )
            
            # Create activity log
            UserActivityLog.objects.create(
                user=user,
                action='OTP_REQUESTED',
                details={
                    'purpose': purpose,
                    'otp_id': str(otp.id)
                },
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            # TODO: Send OTP via email (implement email service)
            # For now, return in response (remove in production)
            return Response({
                'message': 'OTP sent successfully.',
                'otp': otp_code,  # Remove this in production
                'expires_in': '10 minutes'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def verify_otp(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        if serializer.is_valid():
            otp = serializer.validated_data['otp']
            user = serializer.validated_data['user']
            purpose = serializer.validated_data['purpose']
            
            # Mark OTP as used
            otp.is_used = True
            otp.save()
            
            if purpose == 'login':
                token, created = Token.objects.get_or_create(user=user)
                
                # Create activity log
                UserActivityLog.objects.create(
                    user=user,
                    action='OTP_LOGIN_SUCCESS',
                    details={'method': 'otp'},
                    ip_address=self.get_client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')
                )
                
                return Response({
                    'message': 'Login successful.',
                    'token': token.key,
                    'user': UserProfileSerializer(user).data
                }, status=status.HTTP_200_OK)
            
            elif purpose == 'password_reset':
                # Create a temporary token for password reset
                temp_token = Token.objects.create(user=user)
                
                return Response({
                    'message': 'OTP verified. You can now reset your password.',
                    'reset_token': temp_token.key
                }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def login(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            
            token, created = Token.objects.get_or_create(user=user)
            
            # Create activity log
            UserActivityLog.objects.create(
                user=user,
                action='LOGIN_SUCCESS',
                details={'method': 'password'},
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            return Response({
                'token': token.key,
                'user': UserProfileSerializer(user).data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def logout(self, request):
        try:
            request.user.auth_token.delete()
            
            # Create activity log
            UserActivityLog.objects.create(
                user=request.user,
                action='LOGOUT',
                details={},
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
        except (AttributeError, Token.DoesNotExist):
            pass
        
        return Response({'message': 'Successfully logged out.'}, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def reset_password(self, request):
        serializer = PasswordResetSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            otp = serializer.validated_data['otp']
            new_password = serializer.validated_data['new_password']
            
            # Update password
            user.set_password(new_password)
            user.save()
            
            # Mark OTP as used
            otp.is_used = True
            otp.save()
            
            # Delete all existing tokens for the user
            Token.objects.filter(user=user).delete()
            
            # Create activity log
            UserActivityLog.objects.create(
                user=user,
                action='PASSWORD_RESET',
                details={'method': 'otp'},
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            return Response({
                'message': 'Password reset successful. You can now login with your new password.'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.role == 'admin':
            return User.objects.all()
        return User.objects.filter(id=self.request.user.id)
    
    def get_permissions(self):
        if self.action in ['list', 'destroy']:
            return [IsAdmin()]
        if self.action in ['change_role']:
            return [IsAdmin()]
        return super().get_permissions()
    
    def get_serializer_class(self):
        if self.action in ['update', 'partial_update', 'update_profile']:
            return UserUpdateSerializer
        return super().get_serializer_class()
    
    @action(detail=False, methods=['get'])
    def profile(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['put', 'patch'])
    def update_profile(self, request):
        serializer = self.get_serializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            
            # Create activity log
            UserActivityLog.objects.create(
                user=request.user,
                action='PROFILE_UPDATED',
                details={'fields_updated': list(request.data.keys())},
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def change_role(self, request, pk=None):
        user = self.get_object()
        new_role = request.data.get('role')
        
        if new_role not in dict(User.USER_ROLES):
            return Response(
                {'error': 'Invalid role.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_role = user.role
        user.role = new_role
        user.save()
        
        # Create activity log
        UserActivityLog.objects.create(
            user=request.user,
            action='USER_ROLE_CHANGED',
            details={
                'target_user': str(user.id),
                'old_role': old_role,
                'new_role': new_role
            },
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({
            'message': f'Role changed from {old_role} to {new_role}.',
            'user': UserProfileSerializer(user).data
        })
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def activity_logs(self, request):
        logs = UserActivityLog.objects.filter(user=request.user).order_by('-created_at')
        log_data = []
        for log in logs:
            log_data.append({
                'id': str(log.id),
                'action': log.action,
                'details': log.details,
                'ip_address': log.ip_address,
                'user_agent': log.user_agent[:100] if log.user_agent else None,
                'created_at': log.created_at
            })
        return Response({'logs': log_data})
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip