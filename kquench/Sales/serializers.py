
from django.db import transaction
from rest_framework import serializers

from .models import Sale, SaleItem


class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source='product.product_name',
        read_only=True
    )

    class Meta:
        model = SaleItem
        fields = [
            'sale_item_id',
            'product',
            'product_name',
            'quantity',
            'unit_price',
            'subtotal'
        ]
        read_only_fields = [
            'sale_item_id',
            'unit_price',
            'subtotal'
        ]

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                'Quantity must be greater than zero.'
            )
        return value


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True)

    class Meta:
        model = Sale
        fields = '__all__'
        read_only_fields = [
            'sale_date',
            'total_amount',
            'created_by'
        ]

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError(
                'A sale must contain at least one product.'
            )

        product_ids = [
            item['product'].product_id for item in items
        ]

        if len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError(
                'Do not add the same product more than once to a sale.'
            )

        for item in items:
            if not item['product'].is_active:
                raise serializers.ValidationError(
                    f"{item['product'].product_name} is inactive."
                )

        return items

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')

        sale = Sale.objects.create(**validated_data)

        total = 0

        for item in items_data:
            product = item['product']
            quantity = item['quantity']

            unit_price = product.unit_price
            subtotal = quantity * unit_price

            SaleItem.objects.create(
                sale=sale,
                product=product,
                quantity=quantity,
                unit_price=unit_price,
                subtotal=subtotal
            )

            total += subtotal

        sale.total_amount = total
        sale.save(update_fields=['total_amount'])

        return sale
