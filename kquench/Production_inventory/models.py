from django.conf import settings
from django.db import models
from django.db.models import Q
from django.core.validators import MinValueValidator


class Product(models.Model):
    product_id = models.BigAutoField(primary_key=True)
    product_name = models.CharField(max_length=100)
    description = models.CharField(max_length=255, blank=True, null=True)
    unit_size_ml = models.PositiveIntegerField()
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'products'
        ordering = ['product_name']

    def __str__(self):
        return self.product_name


class ProductionBatch(models.Model):
    batch_id = models.BigAutoField(primary_key=True)
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name='production_batches'
    )
    batch_number = models.CharField(max_length=50, unique=True)
    production_date = models.DateField()
    quantity_produced = models.PositiveIntegerField(
        validators=[MinValueValidator(1)]
    )
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='production_batches_created'
    )

    class Meta:
        db_table = 'production_batches'
        ordering = ['-production_date']

    def __str__(self):
        return self.batch_number


class Inventory(models.Model):
    inventory_id = models.BigAutoField(primary_key=True)
    product = models.OneToOneField(
        Product,
        on_delete=models.PROTECT,
        related_name='inventory'
    )
    quantity_available = models.PositiveIntegerField(default=0)
    reorder_level = models.PositiveIntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'inventory'
        constraints = [
            models.CheckConstraint(
                condition=Q(quantity_available__gte=0),
                name='inventory_quantity_nonnegative'
            ),
            models.CheckConstraint(
                condition=Q(reorder_level__gte=0),
                name='inventory_reorder_nonnegative'
            ),
        ]

    def __str__(self):
        return f'{self.product.product_name}: {self.quantity_available}'


class InventoryTransaction(models.Model):

    class TransactionTypes(models.TextChoices):
        PRODUCTION = 'PRODUCTION', 'Production'
        DELIVERY = 'DELIVERY', 'Delivery'
        ADJUSTMENT_IN = 'ADJUSTMENT_IN', 'Stock Adjustment In'
        ADJUSTMENT_OUT = 'ADJUSTMENT_OUT', 'Stock Adjustment Out'

    transaction_id = models.BigAutoField(primary_key=True)
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name='inventory_transactions'
    )
    transaction_type = models.CharField(
        max_length=20,
        choices=TransactionTypes.choices
    )
    quantity = models.PositiveIntegerField(
        validators=[MinValueValidator(1)]
    )
    transaction_date = models.DateTimeField(auto_now_add=True)
    production_batch = models.ForeignKey(
        ProductionBatch,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='inventory_transactions'
    )
    distribution_item = models.OneToOneField(
        'Distribution.DistributionItem',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='stock_transaction'
    )
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='inventory_transactions_created'
    )

    class Meta:
        db_table = 'inventory_transactions'
        ordering = ['-transaction_date']

    def __str__(self):
        return f'{self.transaction_type} - {self.product.product_name}'