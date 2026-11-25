from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction
from django.db.models import Sum
from rest_framework.exceptions import ValidationError
from .models import (
    Product,
    WaterSupplyReceipt,
    BottlingBatch,
    SupplierReceipt,
    Inventory,
    InventoryTransaction,
)

BOTTLING_LOSS_PERCENTAGE = Decimal("2.00")
BOTTLING_YIELD = Decimal("0.98")
WATER_PRECISION = Decimal("0.000001")


@transaction.atomic
def record_water_receipt(validated_data):
    quantity = validated_data.get("quantity_received_litres")

    if quantity is None or quantity <= 0:
        raise ValidationError(
            "Received water must be greater than zero litres."
        )

    receipt_data = dict(validated_data)
    receipt_data["supplier_name"] = "Nairobi Water"

    return WaterSupplyReceipt.objects.create(**receipt_data)


@transaction.atomic
def record_bottling_batch(validated_data):
    receipt = validated_data.get("water_receipt")
    product = validated_data.get("product")
    bottles = validated_data.get("bottles_produced")

    if not receipt:
        raise ValidationError("Select a water supply receipt.")

    if not product or not product.is_active:
        raise ValidationError("Select an active product.")

    if product.unit_size_ml not in (300, 500, 1000):
        raise ValidationError(
            "Only 300ml, 500ml and 1L products can be bottled."
        )

    if not bottles or bottles <= 0:
        raise ValidationError(
            "The number of bottles must be greater than zero."
        )

    # Lock the receipt to prevent concurrent overuse of its water.
    receipt = WaterSupplyReceipt.objects.select_for_update().filter(
        pk=receipt.pk
    ).first()

    if receipt is None:
        raise ValidationError("The selected water receipt does not exist.")

    finished_litres = (
        Decimal(bottles) * Decimal(product.unit_size_ml)
        / Decimal("1000")
    )

    # A 2% processing loss means 98% of input water becomes finished water.
    water_used = (
        finished_litres / BOTTLING_YIELD
    ).quantize(
        WATER_PRECISION,
        rounding=ROUND_HALF_UP,
    )

    water_loss = (
        water_used - finished_litres
    ).quantize(
        WATER_PRECISION,
        rounding=ROUND_HALF_UP,
    )

    previously_used = (
        BottlingBatch.objects.filter(
            water_receipt=receipt
        ).aggregate(
            total=Sum("water_used_litres")
        )["total"] or Decimal("0")
    )

    remaining_water = (
        receipt.quantity_received_litres - previously_used
    )

    if water_used > remaining_water:
        raise ValidationError(
            f"Insufficient water in receipt {receipt.reference}. "
            f"Available: {remaining_water} litres. "
            f"Required: {water_used} litres."
        )

    batch = BottlingBatch.objects.create(
        water_receipt=receipt,
        product=product,
        bottles_produced=bottles,
        finished_water_litres=finished_litres,
        water_used_litres=water_used,
        water_loss_litres=water_loss,
        loss_percentage=BOTTLING_LOSS_PERCENTAGE,
        notes=validated_data.get("notes"),
        created_by=validated_data.get("created_by"),
        **(
            {"bottling_date": validated_data["bottling_date"]}
            if validated_data.get("bottling_date")
            else {}
        ),
    )

    inventory, _ = Inventory.objects.get_or_create(
        product=product,
        defaults={"quantity_available": 0},
    )

    inventory = Inventory.objects.select_for_update().get(
        pk=inventory.pk
    )

    inventory.quantity_available += bottles
    inventory.save(
        update_fields=["quantity_available", "last_updated"]
    )

    InventoryTransaction.objects.create(
        product=product,
        transaction_type=InventoryTransaction.TransactionTypes.BOTTLING,
        quantity=bottles,
        bottling_batch=batch,
        created_by=validated_data.get("created_by"),
        notes=(
            f"Bottling batch {batch.batch_number}. "
            f"Water input: {water_used} L. "
            f"Finished water: {finished_litres} L. "
            f"Processing loss: {water_loss} L."
        ),
    )

    return batch


# Old finished-product supplier receipts are retained for historical
# records, but must not be created through the new operational workflow.
@transaction.atomic
def record_supplier_receipt(validated_data):
    raise ValidationError(
        "Finished-product supplier receipts are no longer accepted. "
        "Record a Nairobi Water receipt and create a bottling batch."
    )


@transaction.atomic
def adjust_inventory(
    product_id,
    adjustment_type,
    quantity,
    user,
    notes="",
):
    if quantity <= 0:
        raise ValidationError(
            "Adjustment quantity must be greater than zero."
        )

    if adjustment_type not in (
        "ADJUSTMENT_IN",
        "ADJUSTMENT_OUT",
    ):
        raise ValidationError("Invalid adjustment type.")

    inventory = Inventory.objects.select_for_update().filter(
        product_id=product_id
    ).first()

    if inventory is None:
        raise ValidationError(
            "No inventory record exists for this product."
        )

    if adjustment_type == "ADJUSTMENT_IN":
        inventory.quantity_available += quantity
    else:
        if inventory.quantity_available < quantity:
            raise ValidationError(
                "Insufficient stock for this adjustment."
            )

        inventory.quantity_available -= quantity

    inventory.save(
        update_fields=["quantity_available", "last_updated"]
    )

    InventoryTransaction.objects.create(
        product_id=product_id,
        transaction_type=adjustment_type,
        quantity=quantity,
        created_by=user,
        notes=notes,
    )

    return inventory
