
from django.db import transaction
from rest_framework import serializers

from Sales.models import SaleItem
from Production_inventory.models import Product

from .models import (
    Distribution,
    DistributionItem,
    DistributionDestination,
)


class DistributionDestinationSerializer(serializers.ModelSerializer):
    class Meta:
        model = DistributionDestination
        fields = "__all__"
        read_only_fields = [
            "destination_id",
            "created_at",
        ]


class DistributionItemSerializer(serializers.ModelSerializer):
    product = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )

    sale_item = serializers.PrimaryKeyRelatedField(
        queryset=SaleItem.objects.all(),
        required=False,
        allow_null=True,
    )

    product_name = serializers.SerializerMethodField()

    class Meta:
        model = DistributionItem
        fields = [
            "distribution_item_id",
            "product",
            "product_name",
            "sale_item",
            "quantity_dispatched",
        ]
        read_only_fields = ["distribution_item_id"]

    def validate_quantity_dispatched(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Quantity must be greater than zero."
            )
        return value

    def get_product_name(self, obj):
        if obj.product_id:
            return obj.product.product_name

        if obj.sale_item_id:
            return obj.sale_item.product.product_name

        return None


class DistributionSerializer(serializers.ModelSerializer):
    items = DistributionItemSerializer(many=True)

    destination_name = serializers.CharField(
        source="destination.destination_name",
        read_only=True,
    )

    class Meta:
        model = Distribution
        fields = [
            "distribution_id",
            "distribution_type",
            "destination",
            "destination_name",
            "sale",
            "distribution_date",
            "dispatch_date",
            "vehicle_number",
            "driver_name",
            "status",
            "notes",
            "created_by",
            "items",
        ]
        read_only_fields = [
            "distribution_id",
            "dispatch_date",
            "status",
            "created_by",
        ]

    def validate(self, attrs):
        distribution_type = attrs.get(
            "distribution_type",
            Distribution.DistributionTypes.EXTERNAL,
        )

        destination = attrs.get("destination")
        sale = attrs.get("sale")
        items = attrs.get("items", [])

        if not items:
            raise serializers.ValidationError({
                "items": "A delivery must contain at least one item."
            })

        if distribution_type == "INTERNAL":
            if not destination:
                raise serializers.ValidationError({
                    "destination": "Select an internal destination."
                })

            if not destination.is_active:
                raise serializers.ValidationError({
                    "destination": "This destination is inactive."
                })

            if sale:
                raise serializers.ValidationError(
                    "Internal deliveries cannot be linked to a sale."
                )

            for item in items:
                if not item.get("product"):
                    raise serializers.ValidationError(
                        "Every internal delivery item needs a product."
                    )

                if item.get("sale_item"):
                    raise serializers.ValidationError(
                        "Internal deliveries cannot contain sale items."
                    )

        elif distribution_type == "EXTERNAL":
            if not sale:
                raise serializers.ValidationError({
                    "sale": "Select an external customer sale."
                })

            if destination:
                raise serializers.ValidationError(
                    "External deliveries cannot have an internal destination."
                )

            if sale.sale_status == "CANCELLED":
                raise serializers.ValidationError(
                    "Cannot deliver a cancelled sale."
                )

            if sale.payment_status != "PAID":
                raise serializers.ValidationError({
                    "sale": "Only fully paid sales can be assigned for dispatch."
                })

            for item in items:
                sale_item = item.get("sale_item")

                if not sale_item:
                    raise serializers.ValidationError(
                        "Every external delivery item needs a sale item."
                    )

                if sale_item.sale_id != sale.pk:
                    raise serializers.ValidationError(
                        "Every sale item must belong to the selected sale."
                    )

                supplied_product = item.get("product")

                if supplied_product and (
                    supplied_product.pk != sale_item.product_id
                ):
                    raise serializers.ValidationError(
                        "Product does not match the selected sale item."
                    )

                item["product"] = sale_item.product

        else:
            raise serializers.ValidationError(
                "Select a valid distribution type."
            )

        product_ids = [
            item["product"].pk for item in items
        ]

        if len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError(
                "Do not add the same product more than once to a delivery."
            )

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items")

        distribution = Distribution.objects.create(
            **validated_data
        )

        for item in items_data:
            DistributionItem.objects.create(
                distribution=distribution,
                **item,
            )

        return distribution
