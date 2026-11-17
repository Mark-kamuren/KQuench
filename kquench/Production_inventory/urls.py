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
router.register('supplier-receipts', SupplierReceiptViewSet,basename='supplier-receipt')
router.register(
    'inventory/transactions',
    InventoryTransactionViewSet,
    basename='inventory-transaction'
)

router.register(
    'inventory',
    InventoryViewSet,
    basename='inventory'
)

urlpatterns = router.urls