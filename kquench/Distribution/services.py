from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from .models import Distribution, DistributionItem
from Production_inventory.models import Inventory, InventoryTransaction
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

    if distribution.distribution_type not in ['INTERNAL', 'EXTERNAL']:
        raise ValidationError('Invalid distribution type.')

    # Lock the sale first for external deliveries. This serialises
    # dispatches belonging to the same sale.
    sale = None

    if distribution.distribution_type == 'EXTERNAL':
        if not distribution.sale_id:
            raise ValidationError(
                'An external delivery must be linked to a sale.'
            )

        sale = Sale.objects.select_for_update().filter(
            pk=distribution.sale_id
        ).first()

        if sale is None:
            raise ValidationError('The linked sale does not exist.')

        if sale.sale_status == 'CANCELLED':
            raise ValidationError(
                'A cancelled sale cannot be dispatched.'
            )

        if sale.payment_status == 'CANCELLED':
            raise ValidationError(
                'A cancelled payment cannot be dispatched.'
            )

    elif distribution.sale_id is not None:
        raise ValidationError(
            'An internal distribution cannot be linked to a sale.'
        )

    items = list(
        DistributionItem.objects.filter(
            distribution=distribution
        ).select_related(
            'product',
            'sale_item',
            'sale_item__product'
        ).order_by('pk')
    )

    if not items:
        raise ValidationError(
            'A delivery must contain at least one item.'
        )

    prepared = []

    # Validate every item and available stock before deducting anything.
    for item in items:
        if item.quantity_dispatched <= 0:
            raise ValidationError(
                'Dispatched quantities must be greater than zero.'
            )

        product = item.product

        if distribution.distribution_type == 'EXTERNAL':
            if not item.sale_item_id:
                raise ValidationError(
                    'Every external delivery item must reference a sale item.'
                )

            sale_item = SaleItem.objects.select_for_update().filter(
                pk=item.sale_item_id,
                sale_id=sale.sale_id
            ).first()

            if sale_item is None:
                raise ValidationError(
                    'A delivery item does not belong to the selected sale.'
                )

            if product is not None and product.pk != sale_item.product_id:
                raise ValidationError(
                    'The delivery product does not match its sale item.'
                )

            product = sale_item.product

            previously_dispatched = (
                DistributionItem.objects.filter(
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
            )

            if (
                previously_dispatched + item.quantity_dispatched
                > sale_item.quantity
            ):
                raise ValidationError(
                    f'Cannot dispatch more than the outstanding '
                    f'quantity for {product.product_name}.'
                )

        else:
            if item.sale_item_id:
                raise ValidationError(
                    'Internal distribution items cannot reference sale items.'
                )

            if product is None:
                raise ValidationError(
                    'An internal delivery item must have a product.'
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

        # Prevent duplicate inventory transactions for the same item.
        if InventoryTransaction.objects.filter(
            distribution_item=item
        ).exists():
            raise ValidationError(
                'An inventory transaction already exists for this item.'
            )

        prepared.append((item, product, inventory))

    # All validations have passed. Now deduct stock.
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

    if sale and sale.sale_status == 'PENDING':
        sale.sale_status = 'CONFIRMED'
        sale.save(update_fields=['sale_status'])

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

    if distribution.distribution_type == 'INTERNAL':
        distribution.status = 'DELIVERED'
        distribution.save(update_fields=['status'])
        return distribution

    if not distribution.sale_id:
        raise ValidationError(
            'An external delivery must be linked to a sale.'
        )

    sale = Sale.objects.select_for_update().filter(
        pk=distribution.sale_id
    ).first()

    if sale is None:
        raise ValidationError('The linked sale does not exist.')

    if sale.sale_status == 'CANCELLED':
        raise ValidationError(
            'A cancelled sale cannot be completed.'
        )

    distribution.status = 'DELIVERED'
    distribution.save(update_fields=['status'])

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
