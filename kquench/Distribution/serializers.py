from rest_framework import serializers
from .models import Distribution, DistributionItem


class DistributionItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source='sale_item.product.product_name',
        read_only=True
    )

    class Meta:
        model = DistributionItem
        fields = '__all__'


class DistributionSerializer(serializers.ModelSerializer):
    items = DistributionItemSerializer(many=True, read_only=True)

    class Meta:
        model = Distribution
        fields = '__all__'
        read_only_fields = ['created_by']