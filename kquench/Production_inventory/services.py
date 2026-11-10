from django.db import transaction
from django.core.exceptions import ValidationError

from .models import (
    ProductionBatch,
    Inventory,
    InventoryTransaction
)


@transaction.atomic
def record_production(validated_data):
    batch = ProductionBatch.objects.create(**validated_data)

    inventory, created = Inventory.objects.get_or_create(
        product=batch.product,
        defaults={
            'quantity_available': 0,
            'reorder_level': 0
        }
    )

    inventory = Inventory.objects.select_for_update().get(
        pk=inventory.pk
    )

    inventory.quantity_available += batch.quantity_produced
    inventory.save()

    InventoryTransaction.objects.create(
        product=batch.product,
        transaction_type='PRODUCTION',
        quantity=batch.quantity_produced,
        production_batch=batch,
        created_by=batch.created_by,
        notes=f'Production batch {batch.batch_number}'
    )

    return batch