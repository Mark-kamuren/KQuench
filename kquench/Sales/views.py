from rest_framework import viewsets
from .models import Sale, SaleItem
from .serializers import SaleSerializer, SaleItemSerializer


class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.prefetch_related('items')
    serializer_class = SaleSerializer

    role_permissions = {
        'create': ['SALES_OFFICER'],
        'update': ['SALES_OFFICER'],
        'partial_update': ['SALES_OFFICER'],
    }

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class SaleItemViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SaleItem.objects.select_related('sale', 'product')
    serializer_class = SaleItemSerializer