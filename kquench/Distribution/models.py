from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator


class Distribution(models.Model):

    class DistributionStatuses(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        DISPATCHED = 'DISPATCHED', 'Dispatched'
        IN_TRANSIT = 'IN_TRANSIT', 'In Transit'
        DELIVERED = 'DELIVERED', 'Delivered'
        CANCELLED = 'CANCELLED', 'Cancelled'

    distribution_id = models.BigAutoField(primary_key=True)
    sale = models.ForeignKey(
        'Sales.Sale',
        on_delete=models.PROTECT,
        related_name='distributions'
    )
    distribution_date = models.DateTimeField()
    dispatch_date = models.DateTimeField(null=True, blank=True)
    vehicle_number = models.CharField(max_length=50, blank=True)
    driver_name = models.CharField(max_length=100, blank=True)
    status = models.CharField(
        max_length=20,
        choices=DistributionStatuses.choices,
        default=DistributionStatuses.PENDING
    )
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='distributions_created'
    )

    class Meta:
        db_table = 'distributions'
        ordering = ['-distribution_date']

    def __str__(self):
        return f'Delivery #{self.distribution_id}'


class DistributionItem(models.Model):
    distribution_item_id = models.BigAutoField(primary_key=True)
    distribution = models.ForeignKey(
        Distribution,
        on_delete=models.CASCADE,
        related_name='items'
    )
    sale_item = models.ForeignKey(
        'Sales.SaleItem',
        on_delete=models.PROTECT,
        related_name='distribution_items'
    )
    quantity_dispatched = models.PositiveIntegerField(
        validators=[MinValueValidator(1)]
    )

    class Meta:
        db_table = 'distribution_items'
        constraints = [
            models.UniqueConstraint(
                fields=['distribution', 'sale_item'],
                name='unique_sale_item_per_distribution'
            )
        ]

    def clean(self):
        from django.core.exceptions import ValidationError

        if self.distribution_id and self.sale_item_id:
            if self.distribution.sale_id != self.sale_item.sale_id:
                raise ValidationError(
                    'The sale item must belong to the distribution sale.'
                )

    def __str__(self):
        return f'Delivery item #{self.distribution_item_id}'