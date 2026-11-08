from rest_framework import viewsets
from .models import Sale, SaleItem
from .serializers import SaleSerializer, SaleItemSerializer


class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.prefetch_related('items')
    serializer_class = SaleSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class SaleItemViewSet(viewsets.ModelViewSet):
    queryset = SaleItem.objects.select_related('sale', 'product')
    serializer_class = SaleItemSerializer