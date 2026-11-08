from rest_framework import serializers
from .models import PredictionRun, Prediction


class PredictionRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = PredictionRun
        fields = '__all__'


class PredictionSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source='product.product_name',
        read_only=True
    )
    model_name = serializers.CharField(
        source='run.model_name',
        read_only=True
    )

    class Meta:
        model = Prediction
        fields = '__all__'