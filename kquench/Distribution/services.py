from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import Distribution, DistributionItem
from Production_inventory.models import (
    Inventory,
    InventoryTransaction
)
from Sales.models import SaleItem, Sale


@transaction.atomic
def dispatch_distribution(distribution_id, user):
    distribution = Distribution.objects.select_for_update().get(
        pk=distribution_id
    )

    if distribution.status != 'PENDING':
        raise ValidationError(
            'Only pending deliveries can be dispatched.'
        )

    items = list(
        DistributionItem.objects.filter(
            distribution=distribution
        ).select_related(
            'sale_item',
            'sale_item__product'
        )
    )

    if not items:
        raise ValidationError(
            'A delivery must contain at least one item.'
        )

    for item in items:
        sale_item = SaleItem.objects.select_for_update().get(
            pk=item.sale_item_id
        )

        dispatched = DistributionItem.objects.filter(
            sale_item=sale_item,
            distribution__status__in=[
                'DISPATCHED',
                'IN_TRANSIT',
                'DELIVERED'
            ]
        ).exclude(
            distribution=distribution
        ).aggregate(
            total=Sum('quantity_dispatched')
        )['total'] or 0

        if dispatched + item.quantity_dispatched > sale_item.quantity:
            raise ValidationError(
                f'Cannot dispatch more than the outstanding quantity '
                f'for {sale_item.product.product_name}.'
            )

        inventory = Inventory.objects.select_for_update().get(
            product=sale_item.product
        )

        if inventory.quantity_available < item.quantity_dispatched:
            raise ValidationError(
                f'Insufficient stock for '
                f'{sale_item.product.product_name}. '
                f'Available: {inventory.quantity_available}.'
            )

        inventory.quantity_available -= item.quantity_dispatched
        inventory.save(update_fields=['quantity_available', 'last_updated'])

        InventoryTransaction.objects.create(
            product=sale_item.product,
            transaction_type='DELIVERY',
            quantity=item.quantity_dispatched,
            distribution_item=item,
            created_by=user,
            notes=f'Dispatched through delivery #{distribution.distribution_id}'
        )

    distribution.status = 'DISPATCHED'
    distribution.dispatch_date = timezone.now()
    distribution.save(update_fields=['status', 'dispatch_date'])

    return distribution


@transaction.atomic
def complete_distribution(distribution_id):
    distribution = Distribution.objects.select_for_update().get(
        pk=distribution_id
    )

    if distribution.status not in ['DISPATCHED', 'IN_TRANSIT']:
        raise ValidationError(
            'Only dispatched or in-transit deliveries can be completed.'
        )

    distribution.status = 'DELIVERED'
    distribution.save(update_fields=['status'])

    sale = Sale.objects.select_for_update().get(
        pk=distribution.sale_id
    )

    ordered = SaleItem.objects.filter(
        sale=sale
    ).aggregate(
        total=Sum('quantity')
    )['total'] or 0

    delivered = DistributionItem.objects.filter(
        sale_item__sale=sale,
        distribution__status='DELIVERED'
    ).aggregate(
        total=Sum('quantity_dispatched')
    )['total'] or 0

    if delivered >= ordered:
        sale.sale_status = 'COMPLETED'
    elif delivered > 0:
        sale.sale_status = 'PARTIALLY_DELIVERED'
    else:
        sale.sale_status = 'CONFIRMED'

    sale.save(update_fields=['sale_status'])

    return distribution