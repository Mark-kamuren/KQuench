from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Sale, SaleItem
from .serializers import SaleSerializer, SaleItemSerializer
from .services import cancel_sale

class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.prefetch_related('items')
    serializer_class = SaleSerializer

    role_permissions = {
        'list': ['SALES_OFFICER', 'DISTRIBUTION_OFFICER'],
        'retrieve': ['SALES_OFFICER', 'DISTRIBUTION_OFFICER'],
        'create': ['SALES_OFFICER'],
        'update': ['SALES_OFFICER'],
        'partial_update': ['SALES_OFFICER'],
        'cancel_action': ['SALES_OFFICER'],
    }

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel_action(self, request, pk=None):
        sale = cancel_sale(pk)

        return Response(
            self.get_serializer(sale).data,
            status=status.HTTP_200_OK
        )

class SaleItemViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SaleItem.objects.select_related(
        'sale',
        'product'
    )
    serializer_class = SaleItemSerializer

    class SaleItemViewSet(viewsets.ReadOnlyModelViewSet):
        queryset = SaleItem.objects.select_related(
        'sale',
        'product'
    )
    serializer_class = SaleItemSerializer

    role_permissions = {
        'list': ['SALES_OFFICER', 'DISTRIBUTION_OFFICER'],
        'retrieve': ['SALES_OFFICER', 'DISTRIBUTION_OFFICER'],
    }