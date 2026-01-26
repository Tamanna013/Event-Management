import os
from django.core.wsgi import get_wsgi_application

# Make sure 'config.settings' matches your settings folder name
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_wsgi_application()