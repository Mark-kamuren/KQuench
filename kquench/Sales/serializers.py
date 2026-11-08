from rest_framework import serializers
from .models import Sale, SaleItem


class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source='product.product_name',
        read_only=True
    )

    class Meta:
        model = SaleItem
        fields = '__all__'
        read_only_fields = ['subtotal']


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)

    class Meta:
        model = Sale
        fields = '__all__'
        read_only_fields = [
            'sale_date',
            'total_amount',
            'created_by'
        ]