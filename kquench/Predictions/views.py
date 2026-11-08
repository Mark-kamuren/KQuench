from rest_framework import viewsets
from .models import PredictionRun, Prediction
from .serializers import PredictionRunSerializer, PredictionSerializer


class PredictionRunViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PredictionRun.objects.all()
    serializer_class = PredictionRunSerializer


class PredictionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Prediction.objects.select_related('product', 'run')
    serializer_class = PredictionSerializer