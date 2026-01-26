import boto3
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
import uuid
import os
from datetime import datetime

class FileUploadViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def upload(self, request):
        """Handle file uploads"""
        files = request.FILES.getlist('files') or list(request.FILES.values())
        
        if not files:
            return Response(
                {'error': 'No files provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        uploaded_files = []
        
        for file in files:
            try:
                # Generate unique filename
                file_ext = os.path.splitext(file.name)[1]
                filename = f"{uuid.uuid4()}{file_ext}"
                
                # Determine upload type
                upload_type = request.data.get('type', 'general')
                folder = self.get_upload_folder(upload_type, request.user)
                
                # Upload to S3 (or local storage)
                file_url = self.upload_to_s3(file, filename, folder)
                
                uploaded_files.append({
                    'original_name': file.name,
                    'url': file_url,
                    'size': file.size,
                    'type': file.content_type,
                    'uploaded_at': datetime.now().isoformat(),
                })
                
            except Exception as e:
                return Response(
                    {'error': f'Failed to upload {file.name}: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        return Response({
            'message': f'Successfully uploaded {len(uploaded_files)} files',
            'files': uploaded_files,
        })

    def get_upload_folder(self, upload_type, user):
        """Determine upload folder based on type"""
        folders = {
            'profile': f'profiles/{user.id}',
            'event': f'events/{datetime.now().year}/{datetime.now().month}',
            'club': f'clubs/{datetime.now().year}',
            'document': f'documents/{datetime.now().year}/{datetime.now().month}',
            'resource': f'resources/{datetime.now().year}',
        }
        return folders.get(upload_type, 'general')

    def upload_to_s3(self, file, filename, folder):
        """Upload file to S3"""
        if settings.USE_S3:
            s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION_NAME
            )
            
            key = f"{folder}/{filename}"
            s3_client.upload_fileobj(
                file,
                settings.AWS_STORAGE_BUCKET_NAME,
                key,
                ExtraArgs={
                    'ContentType': file.content_type,
                    'ACL': 'public-read' if settings.AWS_S3_PUBLIC else 'private'
                }
            )
            
            return f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{key}"
        else:
            # Local storage fallback
            upload_dir = os.path.join(settings.MEDIA_ROOT, folder)
            os.makedirs(upload_dir, exist_ok=True)
            
            file_path = os.path.join(upload_dir, filename)
            with open(file_path, 'wb+') as destination:
                for chunk in file.chunks():
                    destination.write(chunk)
            
            return f"{settings.MEDIA_URL}{folder}/{filename}"

    @action(detail=False, methods=['post'])
    def delete(self, request):
        """Delete uploaded files"""
        file_urls = request.data.get('urls', [])
        
        if not file_urls:
            return Response(
                {'error': 'No file URLs provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        deleted_count = 0
        errors = []
        
        for url in file_urls:
            try:
                if self.delete_from_s3(url):
                    deleted_count += 1
                else:
                    errors.append(f'Failed to delete: {url}')
            except Exception as e:
                errors.append(f'Error deleting {url}: {str(e)}')

        return Response({
            'message': f'Deleted {deleted_count} files',
            'errors': errors if errors else None,
        })

    def delete_from_s3(self, url):
        """Delete file from S3"""
        if settings.USE_S3:
            s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION_NAME
            )
            
            # Extract key from URL
            bucket_name = settings.AWS_STORAGE_BUCKET_NAME
            key = url.split(f'{bucket_name}.s3.')[1].split('.amazonaws.com/')[1]
            
            s3_client.delete_object(
                Bucket=bucket_name,
                Key=key
            )
            return True
        else:
            # Local storage deletion
            try:
                media_root = settings.MEDIA_ROOT
                relative_path = url.split(settings.MEDIA_URL)[1]
                file_path = os.path.join(media_root, relative_path)
                
                if os.path.exists(file_path):
                    os.remove(file_path)
                    return True
            except:
                pass
            return False