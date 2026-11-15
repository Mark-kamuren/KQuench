from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DistributionViewSet,
    DistributionItemViewSet,
    DistributionDestinationViewSet
)

router = DefaultRouter()

router.register(
    r'distributions',
    DistributionViewSet,
    basename='distribution'
)

router.register(
    r'distribution-items',
    DistributionItemViewSet,
    basename='distribution-item'
)

router.register(
    r'destinations',
    DistributionDestinationViewSet,
    basename='distribution-destination'
)

urlpatterns = [
    path('', include(router.urls)),
]
