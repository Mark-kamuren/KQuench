from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.mixins import (
    CreateModelMixin,
    ListModelMixin,
    RetrieveModelMixin
)
from rest_framework.response import Response

from .models import (
    Distribution,
    DistributionItem,
    DistributionDestination
)

from .serializers import (
    DistributionSerializer,
    DistributionItemSerializer,
    DistributionDestinationSerializer
)

from .services import (
    dispatch_distribution,
    complete_distribution
)


class DistributionDestinationViewSet(viewsets.ModelViewSet):
    queryset = DistributionDestination.objects.all()
    serializer_class = DistributionDestinationSerializer

    role_permissions = {
        'create': ['DISTRIBUTION_OFFICER'],
        'update': ['DISTRIBUTION_OFFICER'],
        'partial_update': ['DISTRIBUTION_OFFICER'],
        'destroy': ['DISTRIBUTION_OFFICER'],
    }


class DistributionViewSet(
    CreateModelMixin,
    ListModelMixin,
    RetrieveModelMixin,
    viewsets.GenericViewSet
):
    queryset = Distribution.objects.select_related(
        'sale',
        'destination',
        'created_by'
    ).prefetch_related(
        'items',
        'items__product',
        'items__sale_item'
    )

    serializer_class = DistributionSerializer

    lookup_field = 'distribution_id'
    lookup_url_kwarg = 'pk'

    role_permissions = {
    'list': ['DISTRIBUTION_OFFICER'],
    'retrieve': ['DISTRIBUTION_OFFICER'],
    'create': ['DISTRIBUTION_OFFICER'],
    'dispatch_action': ['DISTRIBUTION_OFFICER'],
    'complete_action': ['DISTRIBUTION_OFFICER'],
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
        'product',
        'sale_item',
        'sale_item__product'
    )
    serializer_class = DistributionItemSerializer
