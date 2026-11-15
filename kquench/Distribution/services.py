from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from .models import Distribution, DistributionItem
from Production_inventory.models import (
    Inventory,
    InventoryTransaction
)

from Sales.models import Sale, SaleItem


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
            'product',
            'sale_item',
            'sale_item__product'
        )
    )

    if not items:
        raise ValidationError(
            'A delivery must contain at least one item.'
        )

    # Validate all items and stock before deducting anything.
    prepared = []

    for item in items:
        product = item.product

        if product is None and item.sale_item_id:
            product = item.sale_item.product

        if product is None:
            raise ValidationError(
                'A delivery item has no associated product.'
            )

        if distribution.distribution_type == 'EXTERNAL':
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
                    f'Cannot dispatch more than the outstanding '
                    f'quantity for {product.product_name}.'
                )

        inventory = Inventory.objects.select_for_update().filter(
            product=product
        ).first()

        if inventory is None:
            raise ValidationError(
                f'No inventory record exists for {product.product_name}.'
            )

        if inventory.quantity_available < item.quantity_dispatched:
            raise ValidationError(
                f'Insufficient stock for {product.product_name}. '
                f'Available: {inventory.quantity_available}.'
            )

        prepared.append((item, product, inventory))

    # Deduct stock only after all validations succeed.
    for item, product, inventory in prepared:
        inventory.quantity_available -= item.quantity_dispatched
        inventory.save(
            update_fields=['quantity_available', 'last_updated']
        )

        transaction_type = (
            'INTERNAL_DISTRIBUTION'
            if distribution.distribution_type == 'INTERNAL'
            else 'EXTERNAL_SALE'
        )

        InventoryTransaction.objects.create(
            product=product,
            transaction_type=transaction_type,
            quantity=item.quantity_dispatched,
            distribution_item=item,
            created_by=user,
            notes=(
                f'{distribution.distribution_type} delivery '
                f'#{distribution.distribution_id}'
            )
        )

    distribution.status = 'DISPATCHED'
    distribution.dispatch_date = timezone.now()
    distribution.save(
        update_fields=['status', 'dispatch_date']
    )

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

    # Internal deliveries do not update sales.
    if distribution.distribution_type == 'INTERNAL':
        return distribution

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
