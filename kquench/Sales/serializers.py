
import re

from django.db import transaction
from rest_framework import serializers

from .models import Sale, SaleItem


class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source="product.product_name",
        read_only=True,
    )

    class Meta:
        model = SaleItem
        fields = [
            "sale_item_id",
            "product",
            "product_name",
            "quantity",
            "unit_price",
            "subtotal",
        ]
        read_only_fields = [
            "sale_item_id",
            "unit_price",
            "subtotal",
        ]

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Quantity must be greater than zero."
            )
        return value


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, required=False)

    class Meta:
        model = Sale
        fields = "__all__"
        read_only_fields = [
            "sale_date",
            "total_amount",
            "sale_status",
            "created_by",
        ]

    def get_fields(self):
        fields = super().get_fields()

        if self.instance is not None:
            fields["items"].read_only = True

        return fields

    def validate_customer_name(self, value):
        value = " ".join(value.split())

        if len(value.split()) < 2:
            raise serializers.ValidationError(
                "Enter the customer's full name."
            )

        if not re.fullmatch(r"[A-Za-z][A-Za-z\s'-]*", value):
            raise serializers.ValidationError(
                "Customer name must contain valid name characters."
            )

        return value

    def validate_customer_phone(self, value):
        if not re.fullmatch(r"(07|01)\d{8}", value):
            raise serializers.ValidationError(
                "Enter a valid Kenyan phone number containing exactly "
                "10 digits, starting with 07 or 01."
            )

        return value

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError(
                "A sale must contain at least one product."
            )

        product_ids = [
            item["product"].product_id for item in items
        ]

        if len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError(
                "Do not add the same product more than once to a sale."
            )

        for item in items:
            product = item["product"]

            if not product.is_active:
                raise serializers.ValidationError(
                    f"{product.product_name} is inactive."
                )

        return items

    def validate_payment_status(self, value):
        if value == Sale.PaymentStatuses.CANCELLED:
            raise serializers.ValidationError(
                "Use the sale cancellation operation instead."
            )

        if self.instance:
            if self.instance.payment_status == "CANCELLED":
                raise serializers.ValidationError(
                    "A cancelled sale cannot be modified."
                )

            if (
                self.instance.payment_status == "PAID"
                and value != "PAID"
            ):
                raise serializers.ValidationError(
                    "A paid sale cannot be reverted to pending."
                )

        return value

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items", None)

        if not items_data:
            raise serializers.ValidationError({
                "items": "A sale must contain at least one product."
            })

        sale = Sale.objects.create(**validated_data)

        total = 0

        for item in items_data:
            product = item["product"]
            quantity = item["quantity"]

            unit_price = product.unit_price
            subtotal = quantity * unit_price

            SaleItem.objects.create(
                sale=sale,
                product=product,
                quantity=quantity,
                unit_price=unit_price,
                subtotal=subtotal,
            )

            total += subtotal

        sale.total_amount = total
        sale.save(update_fields=["total_amount"])

        return sale
