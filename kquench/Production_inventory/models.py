from django.conf import settings
from django.db import models
from django.db.models import Q
from django.core.validators import MinValueValidator
import uuid
from decimal import Decimal
from django.utils import timezone

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


class WaterSupplyReceipt(models.Model):
    receipt_id = models.BigAutoField(primary_key=True)

    supplier_name = models.CharField(
        max_length=150,
        default="Nairobi Water"
    )

    reference = models.CharField(
        max_length=40,
        unique=True,
        editable=False
    )

    received_date = models.DateField()

    quantity_received_litres = models.DecimalField(
        max_digits=14,
        decimal_places=3,
        validators=[MinValueValidator(Decimal("0.001"))]
    )

    notes = models.TextField(blank=True, null=True)

    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="water_receipts_created"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "water_supply_receipts"
        ordering = ["-received_date", "-receipt_id"]

    def save(self, *args, **kwargs):
        if not self.reference:
            date_part = self.received_date.strftime("%Y%m%d")
            unique_part = uuid.uuid4().hex[:8].upper()
            self.reference = f"NW-{date_part}-{unique_part}"

        self.supplier_name = "Nairobi Water"

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.reference} - {self.quantity_received_litres} L"

# Retained for historical production records.
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

class BottlingBatch(models.Model):
    bottling_batch_id = models.BigAutoField(primary_key=True)

    batch_number = models.CharField(
        max_length=50,
        unique=True,
        blank=True
    )

    water_receipt = models.ForeignKey(
        WaterSupplyReceipt,
        on_delete=models.PROTECT,
        related_name="bottling_batches"
    )

    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="bottling_batches"
    )

    bottles_produced = models.PositiveIntegerField(
        validators=[MinValueValidator(1)]
    )

    finished_water_litres = models.DecimalField(
        max_digits=14,
        decimal_places=3
    )

    water_used_litres = models.DecimalField(
        max_digits=14,
        decimal_places=6
    )

    water_loss_litres = models.DecimalField(
        max_digits=14,
        decimal_places=6
    )

    loss_percentage = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=Decimal("2.00")
    )

    bottling_date = models.DateTimeField(default=timezone.now)

    notes = models.TextField(blank=True, null=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="bottling_batches_created"
    )

    class Meta:
        db_table = "bottling_batches"
        ordering = ["-bottling_date"]

    def save(self, *args, **kwargs):
        if not self.batch_number:
            date_part = timezone.localdate().strftime("%Y%m%d")
            unique_part = uuid.uuid4().hex[:8].upper()
            self.batch_number = f"KQB-{date_part}-{unique_part}"

        super().save(*args, **kwargs)

    def __str__(self):
        return self.batch_number

class SupplierReceipt(models.Model):
    receipt_id = models.BigAutoField(primary_key=True)
    supplier_name = models.CharField(max_length=150)
    delivery_reference = models.CharField(max_length=100)
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name='supplier_receipts'
    )
    received_date = models.DateField()
    quantity_received = models.PositiveIntegerField(
        validators=[MinValueValidator(1)]
    )
    notes = models.TextField(blank=True, null=True)
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='supplier_receipts_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'supplier_receipts'
        ordering = ['-received_date']

    def __str__(self):
        return f'{self.supplier_name} - {self.delivery_reference}'


class Inventory(models.Model):
    inventory_id = models.BigAutoField(primary_key=True)

    product = models.OneToOneField(
        Product,
        on_delete=models.PROTECT,
        related_name="inventory"
    )

    quantity_available = models.PositiveIntegerField(default=0)

    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "inventory"
        constraints = [
            models.CheckConstraint(
                condition=Q(quantity_available__gte=0),
                name="inventory_quantity_nonnegative"
            ),
        ]

    def __str__(self):
        return f"{self.product.product_name}: {self.quantity_available}"
class InventoryTransaction(models.Model):

    class TransactionTypes(models.TextChoices):
        SUPPLIER_RECEIPT = 'SUPPLIER_RECEIPT', 'Supplier Receipt'
        INTERNAL_DISTRIBUTION = 'INTERNAL_DISTRIBUTION', 'Internal Distribution'
        EXTERNAL_SALE = 'EXTERNAL_SALE', 'External Sale'
        ADJUSTMENT_IN = 'ADJUSTMENT_IN', 'Stock Adjustment In'
        ADJUSTMENT_OUT = 'ADJUSTMENT_OUT', 'Stock Adjustment Out'

        # Retain historical transaction values.
        PRODUCTION = 'PRODUCTION', 'Legacy Production'
        DELIVERY = 'DELIVERY', 'Legacy Delivery'
        BOTTLING = "BOTTLING", "Bottling"

    transaction_id = models.BigAutoField(primary_key=True)
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name='inventory_transactions'
    )
    transaction_type = models.CharField(
        max_length=30,
        choices=TransactionTypes.choices
    )
    quantity = models.PositiveIntegerField(
        validators=[MinValueValidator(1)]
    )
    transaction_date = models.DateTimeField(auto_now_add=True)

    # Historical relationship.
    production_batch = models.ForeignKey(
        ProductionBatch,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='inventory_transactions'
    )

    supplier_receipt = models.ForeignKey(
        SupplierReceipt,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='inventory_transactions'
    )

    bottling_batch = models.ForeignKey(
    BottlingBatch,
    on_delete=models.PROTECT,
    null=True,
    blank=True,
    related_name="inventory_transactions"
)
    # Retained for the existing distribution implementation.
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
