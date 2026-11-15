from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator

class DistributionDestination(models.Model):

    class DestinationTypes(models.TextChoices):
        AIRLINE_OPERATIONS = 'AIRLINE_OPERATIONS', 'Airline Operations'
        AIRCRAFT = 'AIRCRAFT', 'Aircraft'
        LOUNGE = 'LOUNGE', 'Lounge'
        CAFE = 'CAFE', 'Cafe'
        OTHER = 'OTHER', 'Other'

    destination_id = models.BigAutoField(primary_key=True)
    destination_name = models.CharField(max_length=150, unique=True)
    destination_type = models.CharField(
        max_length=30,
        choices=DestinationTypes.choices
    )
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'distribution_destinations'
        ordering = ['destination_name']

    def __str__(self):
        return self.destination_name


class Distribution(models.Model):

    class DistributionTypes(models.TextChoices):
        INTERNAL = 'INTERNAL', 'Internal'
        EXTERNAL = 'EXTERNAL', 'External'

    class DistributionStatuses(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        DISPATCHED = 'DISPATCHED', 'Dispatched'
        IN_TRANSIT = 'IN_TRANSIT', 'In Transit'
        DELIVERED = 'DELIVERED', 'Delivered'
        CANCELLED = 'CANCELLED', 'Cancelled'

    distribution_id = models.BigAutoField(primary_key=True)

    distribution_type = models.CharField(
        max_length=20,
        choices=DistributionTypes.choices,
        default=DistributionTypes.EXTERNAL
    )

    # Used for internal deliveries.
    destination = models.ForeignKey(
        DistributionDestination,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='distributions'
    )

    # Used for external customer deliveries.
    sale = models.ForeignKey(
        'Sales.Sale',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
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

    # Direct product reference supports internal deliveries.
    product = models.ForeignKey(
        'Production_inventory.Product',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='distribution_items'
    )

    # Sale item reference is only required for external deliveries.
    sale_item = models.ForeignKey(
        'Sales.SaleItem',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
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

        if self.sale_item_id and self.product_id:
            if self.sale_item.product_id != self.product_id:
                raise ValidationError(
                    'The selected product does not match the sale item.'
                )

        if self.distribution_id:
            distribution = self.distribution

            if distribution.distribution_type == 'INTERNAL':
                if self.sale_item_id:
                    raise ValidationError(
                        'Internal distributions cannot contain sale items.'
                    )

            elif distribution.distribution_type == 'EXTERNAL':
                if not self.sale_item_id:
                    raise ValidationError(
                        'External distributions require a sale item.'
                    )

    def __str__(self):
        return f'Delivery item #{self.distribution_item_id}'
