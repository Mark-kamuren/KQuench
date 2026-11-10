from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.mixins import (
    CreateModelMixin,
    ListModelMixin,
    RetrieveModelMixin
)
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from .models import (
    Product,
    ProductionBatch,
    Inventory,
    InventoryTransaction
)

from .serializers import (
    ProductSerializer,
    ProductionBatchSerializer,
    InventorySerializer,
    InventoryTransactionSerializer
)

from .services import record_production, adjust_inventory


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    role_permissions = {
        'create': ['INVENTORY_MANAGER'],
        'update': ['INVENTORY_MANAGER'],
        'partial_update': ['INVENTORY_MANAGER'],
        'destroy': ['INVENTORY_MANAGER'],
    }


class ProductionBatchViewSet(
    CreateModelMixin,
    ListModelMixin,
    RetrieveModelMixin,
    viewsets.GenericViewSet
):
    queryset = ProductionBatch.objects.select_related(
        'product',
        'created_by'
    )
    serializer_class = ProductionBatchSerializer

    role_permissions = {
        'create': ['PRODUCTION_MANAGER'],
    }

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class InventoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Inventory.objects.select_related('product')
    serializer_class = InventorySerializer

    role_permissions = {
        'adjust': ['INVENTORY_MANAGER'],
    }

    @action(detail=True, methods=['post'])
    def adjust(self, request, pk=None):

        inventory = self.get_object()

        adjustment_type = request.data.get('adjustment_type')
        raw_quantity = request.data.get('quantity')
        notes = request.data.get('notes', '')

        if adjustment_type not in [
            'ADJUSTMENT_IN',
            'ADJUSTMENT_OUT'
        ]:
            raise ValidationError(
                'Adjustment type must be ADJUSTMENT_IN or ADJUSTMENT_OUT.'
            )

        quantity = serializers.IntegerField(
            min_value=1
        ).run_validation(raw_quantity)

        if not isinstance(notes, str):
            raise ValidationError('Notes must be text.')

        inventory = adjust_inventory(
            product_id=inventory.product_id,
            adjustment_type=adjustment_type,
            quantity=quantity,
            user=request.user,
            notes=notes
        )

        return Response(
            InventorySerializer(inventory).data,
            status=status.HTTP_200_OK
        )


class InventoryTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = InventoryTransaction.objects.select_related(
        'product',
        'created_by',
        'production_batch',
        'distribution_item'
    )
    serializer_class = InventoryTransactionSerializer