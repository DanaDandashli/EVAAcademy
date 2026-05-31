from django.core.management.base import BaseCommand
from django.conf import settings
import os


class Command(BaseCommand):
    help = 'Create default admin user'

    def handle(self, *args, **kwargs):
        from app.user.models import User

        username = os.getenv('ADMIN_USERNAME', 'admin')
        password = os.getenv('ADMIN_PASSWORD')
        email = os.getenv('ADMIN_EMAIL', 'admin@evaacademy.com')

        if not password:
            self.stdout.write(self.style.WARNING(
                'ADMIN_PASSWORD not set — skipping'))
            return

        if User.objects.filter(username=username).exists():
            self.stdout.write('Admin already exists — skipping')
            return

        User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            role='admin',
        )
        self.stdout.write(self.style.SUCCESS(
            f'Admin user created — username: {username}'))
