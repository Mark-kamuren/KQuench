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

    def create(self, validated_data):
        from .services import record_production
        return record_production(validated_data)


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
        read_only_fields = [
            'transaction_id',
            'product',
            'transaction_type',
            'quantity',
            'transaction_date',
            'production_batch',
            'distribution_item',
            'notes',
            'created_by'
        ]