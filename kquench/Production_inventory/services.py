from django.db import transaction
from rest_framework.exceptions import ValidationError

from .models import (
    SupplierReceipt,
    Inventory,
    InventoryTransaction
)


@transaction.atomic
def record_supplier_receipt(validated_data):
    """
    Record water received from an external supplier
    and increase available inventory.
    """

    quantity = validated_data.get('quantity_received')

    if not quantity or quantity <= 0:
        raise ValidationError(
            'Received quantity must be greater than zero.'
        )

    receipt = SupplierReceipt.objects.create(**validated_data)

    inventory, created = Inventory.objects.get_or_create(
        product=receipt.product,
        defaults={
            'quantity_available': 0,
            'reorder_level': 0
        }
    )

    inventory = Inventory.objects.select_for_update().get(
        pk=inventory.pk
    )

    inventory.quantity_available += receipt.quantity_received
    inventory.save()

    InventoryTransaction.objects.create(
        product=receipt.product,
        transaction_type='SUPPLIER_RECEIPT',
        quantity=receipt.quantity_received,
        supplier_receipt=receipt,
        created_by=receipt.received_by,
        notes=(
            f'Supplier: {receipt.supplier_name}. '
            f'Reference: {receipt.delivery_reference}'
        )
    )

    return receipt


@transaction.atomic
def adjust_inventory(
    product_id,
    adjustment_type,
    quantity,
    user,
    notes=''
):
    if quantity <= 0:
        raise ValidationError(
            'Adjustment quantity must be greater than zero.'
        )

    if adjustment_type not in [
        'ADJUSTMENT_IN',
        'ADJUSTMENT_OUT'
    ]:
        raise ValidationError('Invalid adjustment type.')

    inventory = Inventory.objects.select_for_update().filter(
        product_id=product_id
    ).first()

    if inventory is None:
        raise ValidationError(
            'No inventory record exists for this product.'
        )

    if adjustment_type == 'ADJUSTMENT_IN':
        inventory.quantity_available += quantity
    else:
        if inventory.quantity_available < quantity:
            raise ValidationError(
                'Insufficient stock for this adjustment.'
            )

        inventory.quantity_available -= quantity

    inventory.save()

    InventoryTransaction.objects.create(
        product_id=product_id,
        transaction_type=adjustment_type,
        quantity=quantity,
        created_by=user,
        notes=notes
    )

    return inventory
