from django.db import transaction
from rest_framework.exceptions import ValidationError

from .models import (
    ProductionBatch,
    Inventory,
    InventoryTransaction
)


@transaction.atomic
def record_production(validated_data):
    """
    Record a production batch, increase available stock
    and create an inventory transaction.
    """

    quantity = validated_data.get('quantity_produced')

    if quantity is None or quantity <= 0:
        raise ValidationError(
            'Production quantity must be greater than zero.'
        )

    # Create production batch
    batch = ProductionBatch.objects.create(**validated_data)

    # Get or create inventory record
    inventory, created = Inventory.objects.get_or_create(
        product=batch.product,
        defaults={
            'quantity_available': 0,
            'reorder_level': 0
        }
    )

    # Lock inventory before updating
    inventory = Inventory.objects.select_for_update().get(
        pk=inventory.pk
    )

    # Increase stock
    inventory.quantity_available += batch.quantity_produced
    inventory.save()

    # Record inventory transaction
    InventoryTransaction.objects.create(
        product=batch.product,
        transaction_type='PRODUCTION',
        quantity=batch.quantity_produced,
        production_batch=batch,
        created_by=batch.created_by,
        notes=f'Production batch {batch.batch_number}'
    )

    return batch


@transaction.atomic
def adjust_inventory(
    product_id,
    adjustment_type,
    quantity,
    user,
    notes=''
):
    """
    Increase or decrease inventory and record the adjustment.
    """

    if quantity <= 0:
        raise ValidationError(
            'Adjustment quantity must be greater than zero.'
        )

    if adjustment_type not in [
        'ADJUSTMENT_IN',
        'ADJUSTMENT_OUT'
    ]:
        raise ValidationError('Invalid adjustment type.')

    # Lock the inventory record
    inventory = Inventory.objects.select_for_update().filter(
        product_id=product_id
    ).first()

    if inventory is None:
        raise ValidationError(
            'No inventory record exists for this product.'
        )

    # Apply adjustment
    if adjustment_type == 'ADJUSTMENT_IN':
        inventory.quantity_available += quantity

    else:
        if inventory.quantity_available < quantity:
            raise ValidationError(
                'Insufficient stock for this adjustment.'
            )

        inventory.quantity_available -= quantity

    inventory.save()

    # Record the adjustment
    InventoryTransaction.objects.create(
        product_id=product_id,
        transaction_type=adjustment_type,
        quantity=quantity,
        created_by=user,
        notes=notes
    )

    return inventory