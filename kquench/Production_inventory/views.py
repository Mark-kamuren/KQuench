from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework import viewsets
from rest_framework.mixins import (
    CreateModelMixin,
    ListModelMixin,
    RetrieveModelMixin
)

from .models import Product, ProductionBatch, Inventory, InventoryTransaction
from .serializers import (
    ProductSerializer,
    ProductionBatchSerializer,
    InventorySerializer,
    InventoryTransactionSerializer
)


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class ProductionBatchViewSet(
    CreateModelMixin,
    ListModelMixin,
    RetrieveModelMixin,
    viewsets.GenericViewSet
):
    queryset = ProductionBatch.objects.select_related(
        'product', 'created_by'
    )
    serializer_class = ProductionBatchSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class InventoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Inventory.objects.select_related('product')
    serializer_class = InventorySerializer


class InventoryTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = InventoryTransaction.objects.select_related('product')
    serializer_class = InventoryTransactionSerializer