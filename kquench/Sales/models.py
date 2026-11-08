from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator


class Sale(models.Model):

    class PaymentStatuses(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PAID = 'PAID', 'Paid'
        CANCELLED = 'CANCELLED', 'Cancelled'

    class SaleStatuses(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        CONFIRMED = 'CONFIRMED', 'Confirmed'
        PARTIALLY_DELIVERED = 'PARTIALLY_DELIVERED', 'Partially Delivered'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    sale_id = models.BigAutoField(primary_key=True)
    customer_name = models.CharField(max_length=150)
    customer_phone = models.CharField(max_length=20)
    delivery_address = models.CharField(max_length=255)
    sale_date = models.DateTimeField(auto_now_add=True)
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )
    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatuses.choices,
        default=PaymentStatuses.PENDING
    )
    sale_status = models.CharField(
        max_length=25,
        choices=SaleStatuses.choices,
        default=SaleStatuses.PENDING
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='sales_created'
    )

    class Meta:
        db_table = 'sales'
        ordering = ['-sale_date']

    def __str__(self):
        return f'Sale #{self.sale_id}'


class SaleItem(models.Model):
    sale_item_id = models.BigAutoField(primary_key=True)
    sale = models.ForeignKey(
        Sale,
        on_delete=models.CASCADE,
        related_name='items'
    )
    product = models.ForeignKey(
        'Production_inventory.Product',
        on_delete=models.PROTECT,
        related_name='sale_items'
    )
    quantity = models.PositiveIntegerField(
        validators=[MinValueValidator(1)]
    )
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )

    class Meta:
        db_table = 'sale_items'

    def save(self, *args, **kwargs):
        self.subtotal = self.quantity * self.unit_price
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.product.product_name} - {self.quantity}'