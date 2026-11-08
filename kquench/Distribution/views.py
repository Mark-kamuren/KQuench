from rest_framework import viewsets
from .models import Distribution, DistributionItem
from .serializers import DistributionSerializer, DistributionItemSerializer


class DistributionViewSet(viewsets.ModelViewSet):
    queryset = Distribution.objects.prefetch_related('items')
    serializer_class = DistributionSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class DistributionItemViewSet(viewsets.ModelViewSet):
    queryset = DistributionItem.objects.select_related(
        'distribution', 'sale_item', 'sale_item__product'
    )
    serializer_class = DistributionItemSerializer