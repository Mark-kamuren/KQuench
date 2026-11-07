
# Create your models here.
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):

    class Roles(models.TextChoices):
        ADMIN = 'ADMIN', 'Administrator'
        PRODUCTION_MANAGER = 'PRODUCTION_MANAGER', 'Production Manager'
        INVENTORY_MANAGER = 'INVENTORY_MANAGER', 'Inventory Manager'
        SALES_OFFICER = 'SALES_OFFICER', 'Sales Officer'
        DISTRIBUTION_OFFICER = 'DISTRIBUTION_OFFICER', 'Distribution Officer'

    role = models.CharField(
        max_length=30,
        choices=Roles.choices
    )

    REQUIRED_FIELDS = ['email', 'role']

    def __str__(self):
        return f"{self.username} - {self.get_role_display()}"