from rest_framework import serializers

from .models import (
    Product,
    ProductionBatch,
    SupplierReceipt,
    Inventory,
    InventoryTransaction
)

from .services import record_supplier_receipt


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'


class SupplierReceiptSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source='product.product_name',
        read_only=True
    )

    class Meta:
        model = SupplierReceipt
        fields = '__all__'
        read_only_fields = [
            'receipt_id',
            'received_by',
            'created_at'
        ]

    def create(self, validated_data):
        return record_supplier_receipt(validated_data)


# Historical records only. New records use SupplierReceipt.
class ProductionBatchSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source='product.product_name',
        read_only=True
    )

    class Meta:
        model = ProductionBatch
        fields = '__all__'
        read_only_fields = [
            'batch_id',
            'product',
            'batch_number',
            'production_date',
            'quantity_produced',
            'notes',
            'created_by'
            ]


class InventorySerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source='product.product_name',
        read_only=True
    )

    class Meta:
        model = Inventory
        fields = '__all__'
        read_only_fields = [
            'quantity_available',
            'last_updated'
        ]
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
            'supplier_receipt',
            'distribution_item',
            'notes',
            'created_by'
            ]
