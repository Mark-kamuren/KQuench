
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import DistributionViewSet, DistributionItemViewSet

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

urlpatterns = [
    path('', include(router.urls)),
]
