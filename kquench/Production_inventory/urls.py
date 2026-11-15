from rest_framework.routers import DefaultRouter
from .views import (
    ProductViewSet,
    ProductionBatchViewSet,
    InventoryViewSet,
    InventoryTransactionViewSet,
    SupplierReceiptViewSet,
)

router = DefaultRouter()
router.register('products', ProductViewSet)
router.register('production', ProductionBatchViewSet)
router.register('inventory', InventoryViewSet)
router.register('inventory/transactions', InventoryTransactionViewSet)
router.register('supplier-receipts', SupplierReceiptViewSet,basename='supplier-receipt')

urlpatterns = router.urls