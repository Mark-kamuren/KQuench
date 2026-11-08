from rest_framework.routers import DefaultRouter
from .views import SaleViewSet, SaleItemViewSet

router = DefaultRouter()
router.register('sales', SaleViewSet)
router.register('sale-items', SaleItemViewSet)

urlpatterns = router.urls