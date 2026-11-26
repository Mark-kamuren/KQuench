
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from rest_framework.exceptions import ValidationError

from .models import Distribution, DistributionItem
from Production_inventory.models import Inventory, InventoryTransaction
from Sales.models import Sale


@transaction.atomic
def dispatch_distribution(distribution_id, user):
    distribution = (
        Distribution.objects.select_for_update()
        .select_related("sale", "destination")
        .filter(distribution_id=distribution_id)
        .first()
    )

    if distribution is None:
        raise ValidationError("Distribution not found.")

    if distribution.status != "PENDING":
        raise ValidationError(
            "Only pending distributions can be dispatched."
        )

    sale = None

    if distribution.distribution_type == "EXTERNAL":
        if not distribution.sale_id:
            raise ValidationError(
                "An external distribution must be linked to a sale."
            )

        sale = Sale.objects.select_for_update().get(
            sale_id=distribution.sale_id
        )

        if sale.sale_status == "CANCELLED":
            raise ValidationError(
                "A cancelled sale cannot be dispatched."
            )

    elif distribution.distribution_type == "INTERNAL":
        if not distribution.destination_id:
            raise ValidationError(
                "An internal distribution needs a destination."
            )

        if distribution.sale_id:
            raise ValidationError(
                "An internal distribution cannot be linked to a sale."
            )
    else:
        raise ValidationError("Invalid distribution type.")

    items = list(
        DistributionItem.objects.select_related(
            "product",
            "sale_item",
            "sale_item__product",
        ).filter(distribution=distribution)
    )

    if not items:
        raise ValidationError(
            "A distribution must contain at least one item."
        )

    requirements = {}

    for item in items:
        if item.quantity_dispatched <= 0:
            raise ValidationError(
                "Distribution quantities must be greater than zero."
            )

        if distribution.distribution_type == "EXTERNAL":
            if not item.sale_item_id:
                raise ValidationError(
                    "Every external delivery item must reference a sale item."
                )

            if item.sale_item.sale_id != distribution.sale_id:
                raise ValidationError(
                    "A delivery item does not belong to the selected sale."
                )

            if item.product_id != item.sale_item.product_id:
                raise ValidationError(
                    "The delivery product does not match the sale item."
                )

            previously_dispatched = (
                DistributionItem.objects.filter(
                    sale_item=item.sale_item,
                    distribution__distribution_type="EXTERNAL",
                    distribution__status__in=[
                        "DISPATCHED",
                        "IN_TRANSIT",
                        "DELIVERED",
                    ],
                )
                .exclude(distribution=distribution)
                .aggregate(total=Sum("quantity_dispatched"))["total"]
                or 0
            )

            if (
                previously_dispatched + item.quantity_dispatched
                > item.sale_item.quantity
            ):
                raise ValidationError(
                    f"Dispatching this quantity exceeds the ordered "
                    f"quantity for {item.sale_item.product.product_name}."
                )

        else:
            if not item.product_id:
                raise ValidationError(
                    "Every internal delivery item needs a product."
                )

            if item.sale_item_id:
                raise ValidationError(
                    "Internal deliveries cannot reference sale items."
                )

        requirements[item.product_id] = (
            requirements.get(item.product_id, 0)
            + item.quantity_dispatched
        )

    inventories = {}

    for product_id in sorted(requirements):
        inventory = (
            Inventory.objects.select_for_update()
            .filter(product_id=product_id)
            .first()
        )

        if inventory is None:
            raise ValidationError(
                f"No inventory record exists for product ID {product_id}."
            )

        required = requirements[product_id]

        if inventory.quantity_available < required:
            raise ValidationError(
                f"Insufficient stock for {inventory.product.product_name}. "
                f"Available: {inventory.quantity_available}; "
                f"required: {required}."
            )

        inventories[product_id] = inventory

    for item in items:
        if InventoryTransaction.objects.filter(
            distribution_item=item
        ).exists():
            raise ValidationError(
                "A distribution item has already been deducted from stock."
            )

    for product_id, quantity in requirements.items():
        inventory = inventories[product_id]
        inventory.quantity_available -= quantity
        inventory.save(
            update_fields=["quantity_available", "last_updated"]
        )

    for item in items:
        transaction_type = (
            "INTERNAL_DISTRIBUTION"
            if distribution.distribution_type == "INTERNAL"
            else "EXTERNAL_SALE"
        )

        InventoryTransaction.objects.create(
            product_id=item.product_id,
            transaction_type=transaction_type,
            quantity=item.quantity_dispatched,
            distribution_item=item,
            created_by=user,
            notes=f"Distribution #{distribution.distribution_id} dispatched.",
        )

    distribution.status = "DISPATCHED"
    distribution.dispatch_date = timezone.now()
    distribution.save(
        update_fields=["status", "dispatch_date"]
    )

    if sale and sale.sale_status == "PENDING":
        sale.sale_status = "CONFIRMED"
        sale.save(update_fields=["sale_status"])

    return distribution


@transaction.atomic
def complete_distribution(distribution_id):
    distribution = (
        Distribution.objects.select_for_update()
        .select_related("sale")
        .filter(distribution_id=distribution_id)
        .first()
    )

    if distribution is None:
        raise ValidationError("Distribution not found.")

    if distribution.status not in ("DISPATCHED", "IN_TRANSIT"):
        raise ValidationError(
            "Only dispatched or in-transit distributions can be completed."
        )

    if distribution.distribution_type == "INTERNAL":
        distribution.status = "DELIVERED"
        distribution.save(update_fields=["status"])
        return distribution

    if not distribution.sale_id:
        raise ValidationError(
            "The external distribution has no linked sale."
        )

    sale = Sale.objects.select_for_update().get(
        sale_id=distribution.sale_id
    )

    if sale.sale_status == "CANCELLED":
        raise ValidationError(
            "A cancelled sale cannot be completed."
        )
   
    if sale.payment_status != "PAID":
        raise ValidationError(
        "This sale must be fully paid before it can be dispatched."
    )
    sale_items = list(sale.items.all())

    if not sale_items:
        raise ValidationError(
            "The sale has no items and cannot be completed."
        )

    distribution.status = "DELIVERED"
    distribution.save(update_fields=["status"])

    any_delivered = False
    all_delivered = True

    for sale_item in sale_items:
        delivered_quantity = (
            DistributionItem.objects.filter(
                sale_item=sale_item,
                distribution__distribution_type="EXTERNAL",
                distribution__status="DELIVERED",
            ).aggregate(
                total=Sum("quantity_dispatched")
            )["total"] or 0
        )

        if delivered_quantity > 0:
            any_delivered = True

        if delivered_quantity < sale_item.quantity:
            all_delivered = False

    if all_delivered:
        sale.sale_status = "COMPLETED"
    elif any_delivered:
        sale.sale_status = "PARTIALLY_DELIVERED"
    else:
        sale.sale_status = "CONFIRMED"

    sale.save(update_fields=["sale_status"])

    return distribution
