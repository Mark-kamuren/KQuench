
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Distribution, DistributionItem
from .serializers import (
    DistributionSerializer,
    DistributionItemSerializer
)
from .services import dispatch_distribution, complete_distribution


class DistributionViewSet(viewsets.ModelViewSet):
    queryset = Distribution.objects.prefetch_related('items')
    serializer_class = DistributionSerializer

    # Use the database primary key for lookups.
    # Keep DRF's default URL keyword argument: pk.
    lookup_field = 'distribution_id'
    lookup_url_kwarg = 'pk'

    role_permissions = {
        'create': ['DISTRIBUTION_OFFICER'],
        'update': ['DISTRIBUTION_OFFICER'],
        'partial_update': ['DISTRIBUTION_OFFICER'],
        'dispatch': ['DISTRIBUTION_OFFICER'],
        'complete': ['DISTRIBUTION_OFFICER'],
    }

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'], url_path='dispatch')
    def dispatch_action(self, request, pk=None):
        distribution = self.get_object()

        distribution = dispatch_distribution(
            distribution.distribution_id,
            request.user
        )

        return Response(
            self.get_serializer(distribution).data,
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], url_path='complete')
    def complete_action(self, request, pk=None):
        distribution = self.get_object()

        distribution = complete_distribution(
            distribution.distribution_id
        )

        return Response(
            self.get_serializer(distribution).data,
            status=status.HTTP_200_OK
        )


class DistributionItemViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DistributionItem.objects.select_related(
        'distribution',
        'sale_item',
        'sale_item__product'
    )
    serializer_class = DistributionItemSerializer
