from rest_framework import serializers
from .models import Product, ProductionBatch, Inventory, InventoryTransaction


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'


class ProductionBatchSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source='product.product_name',
        read_only=True
    )

    class Meta:
        model = ProductionBatch
        fields = '__all__'
        read_only_fields = ['created_by']


class InventorySerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source='product.product_name',
        read_only=True
    )

    class Meta:
        model = Inventory
        fields = '__all__'
        read_only_fields = ['quantity_available', 'last_updated']


class InventoryTransactionSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source='product.product_name',
        read_only=True
    )

    class Meta:
        model = InventoryTransaction
        fields = '__all__'
        read_only_fields = '__all__'