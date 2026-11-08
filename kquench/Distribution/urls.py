from rest_framework.routers import DefaultRouter
from .views import DistributionViewSet, DistributionItemViewSet

router = DefaultRouter()
router.register('distributions', DistributionViewSet)
router.register('distribution-items', DistributionItemViewSet)

urlpatterns = router.urls