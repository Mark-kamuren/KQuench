
from rest_framework.routers import DefaultRouter

from .views import (
    ProductViewSet,
    ProductionBatchViewSet,
    SupplierReceiptViewSet,
    WaterSupplyReceiptViewSet,
    BottlingBatchViewSet,
    InventoryViewSet,
    InventoryTransactionViewSet,
)

router = DefaultRouter()

router.register("products", ProductViewSet)
router.register("production", ProductionBatchViewSet)

# Legacy receipts: read-only.
router.register(
    "supplier-receipts",
    SupplierReceiptViewSet,
    basename="supplier-receipt"
)

# New water receipt and bottling workflow.
router.register(
    "water-receipts",
    WaterSupplyReceiptViewSet,
    basename="water-receipt"
)

router.register(
    "bottling-batches",
    BottlingBatchViewSet,
    basename="bottling-batch"
)

router.register(
    "inventory/transactions",
    InventoryTransactionViewSet,
    basename="inventory-transaction"
)

router.register(
    "inventory",
    InventoryViewSet,
    basename="inventory"
)

urlpatterns = router.urls
