from django.db import transaction
from rest_framework import serializers

from .models import Distribution, DistributionItem


class DistributionItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source='sale_item.product.product_name',
        read_only=True
    )

    class Meta:
        model = DistributionItem
        fields = [
            'distribution_item_id',
            'sale_item',
            'product_name',
            'quantity_dispatched'
        ]
        read_only_fields = ['distribution_item_id']

class DistributionSerializer(serializers.ModelSerializer):
    items = DistributionItemSerializer(many=True)

    class Meta:
        model = Distribution
        fields = '__all__'
        read_only_fields = [
            'distribution_id',
            'dispatch_date',
            'status',
            'created_by'
        ]

    def validate(self, attrs):
        sale = attrs.get('sale')

        for item in attrs.get('items', []):
            if item['sale_item'].sale_id != sale.pk:
                raise serializers.ValidationError(
                    'Every delivery item must belong to the selected sale.'
                )

        if not attrs.get('items'):
            raise serializers.ValidationError(
                'A delivery must contain at least one item.'
            )

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        items = validated_data.pop('items')

        distribution = Distribution.objects.create(**validated_data)

        if distribution.sale.sale_status == 'PENDING':
            distribution.sale.sale_status = 'CONFIRMED'
            distribution.sale.save(update_fields=['sale_status'])

        for item in items:
            DistributionItem.objects.create(
                distribution=distribution,
                **item
            )

        return distribution

    