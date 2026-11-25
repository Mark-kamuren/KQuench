
from rest_framework import serializers

from .models import (
    Product,
    ProductionBatch,
    SupplierReceipt,
    WaterSupplyReceipt,
    BottlingBatch,
    Inventory,
    InventoryTransaction,
)

from .services import (
    record_water_receipt,
    record_bottling_batch,
)


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = "__all__"


class WaterSupplyReceiptSerializer(serializers.ModelSerializer):
    class Meta:
        model = WaterSupplyReceipt
        fields = "__all__"
        read_only_fields = [
            "receipt_id",
            "supplier_name",
            "reference",
            "received_by",
            "created_at",
        ]

    def create(self, validated_data):
        return record_water_receipt(validated_data)


class BottlingBatchSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source="product.product_name",
        read_only=True,
    )

    water_receipt_reference = serializers.CharField(
        source="water_receipt.reference",
        read_only=True,
    )

    class Meta:
        model = BottlingBatch
        fields = "__all__"
        read_only_fields = [
            "bottling_batch_id",
            "batch_number",
            "finished_water_litres",
            "water_used_litres",
            "water_loss_litres",
            "loss_percentage",
            "created_by",
        ]

    def create(self, validated_data):
        request = self.context.get("request")

        if request and request.user.is_authenticated:
            validated_data["created_by"] = request.user

        return record_bottling_batch(validated_data)


class SupplierReceiptSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source="product.product_name",
        read_only=True,
    )

    class Meta:
        model = SupplierReceipt
        fields = "__all__"


class ProductionBatchSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source="product.product_name",
        read_only=True,
    )

    class Meta:
        model = ProductionBatch
        fields = "__all__"


class InventorySerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source="product.product_name",
        read_only=True,
    )

    class Meta:
        model = Inventory
        fields = "__all__"
        read_only_fields = [
            "quantity_available",
            "last_updated",
        ]


class InventoryTransactionSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source="product.product_name",
        read_only=True,
    )

    class Meta:
        model = InventoryTransaction
        fields = "__all__"
        read_only_fields = [
            "transaction_id",
            "product",
            "transaction_type",
            "quantity",
            "transaction_date",
            "production_batch",
            "supplier_receipt",
            "bottling_batch",
            "distribution_item",
            "notes",
            "created_by",
        ]
