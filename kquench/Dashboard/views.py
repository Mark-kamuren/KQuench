from django.db.models import Sum
from rest_framework import viewsets
from rest_framework.response import Response
from Production_inventory.models import (
    Product,
    WaterSupplyReceipt,
    BottlingBatch,
    Inventory,
)

from Sales.models import Sale
from Distribution.models import Distribution, DistributionItem


class DashboardViewSet(viewsets.ViewSet):

    def list(self, request):
        active_products = Product.objects.filter(is_active=True)

        total_stock = (
            Inventory.objects.aggregate(
                total=Sum("quantity_available")
            )["total"] or 0
        )

        total_water_receipts = WaterSupplyReceipt.objects.count()

        total_water_received_litres = (
            WaterSupplyReceipt.objects.aggregate(
                total=Sum("quantity_received_litres")
            )["total"] or 0
        )

        total_bottles_produced = (
            BottlingBatch.objects.aggregate(
                total=Sum("bottles_produced")
            )["total"] or 0
        )

        total_water_used_litres = (
            BottlingBatch.objects.aggregate(
                total=Sum("water_used_litres")
            )["total"] or 0
        )

        total_water_loss_litres = (
            BottlingBatch.objects.aggregate(
                total=Sum("water_loss_litres")
            )["total"] or 0
        )

        valid_sales = Sale.objects.exclude(
            sale_status="CANCELLED"
        )

        total_sales = valid_sales.count()

        total_revenue = (
            Sale.objects.filter(
                payment_status="PAID"
            ).exclude(
                sale_status="CANCELLED"
            ).aggregate(
                total=Sum("total_amount")
            )["total"] or 0
        )

        pending_sales = Sale.objects.filter(
            sale_status="PENDING"
        ).count()

        valid_distributions = Distribution.objects.exclude(
            status="CANCELLED"
        )

        total_internal_distributions = (
            valid_distributions.filter(
                distribution_type="INTERNAL"
            ).count()
        )

        completed_internal_deliveries = (
            Distribution.objects.filter(
                distribution_type="INTERNAL",
                status="DELIVERED"
            ).count()
        )

        completed_external_deliveries = (
            Distribution.objects.filter(
                distribution_type="EXTERNAL",
                status="DELIVERED"
            ).count()
        )

        total_external_deliveries = (
            valid_distributions.filter(
                distribution_type="EXTERNAL"
            ).count()
        )

        delivered_statuses = [
            "DISPATCHED",
            "IN_TRANSIT",
            "DELIVERED",
        ]

        total_internal_units_distributed = (
            DistributionItem.objects.filter(
                distribution__distribution_type="INTERNAL",
                distribution__status__in=delivered_statuses
            ).aggregate(
                total=Sum("quantity_dispatched")
            )["total"] or 0
        )

        data = {
            "total_products": active_products.count(),
            "total_stock": total_stock,

            # Compatibility field for the existing dashboard.
            "total_supplier_receipts": total_water_receipts,
            "total_units_received": total_bottles_produced,

            "total_water_received_litres": total_water_received_litres,
            "total_water_used_litres": total_water_used_litres,
            "total_water_loss_litres": total_water_loss_litres,
            "total_bottles_produced": total_bottles_produced,

            "total_sales": total_sales,
            "total_revenue": total_revenue,
            "pending_sales": pending_sales,

            "total_internal_distributions": total_internal_distributions,
            "total_internal_units_distributed": total_internal_units_distributed,
            "total_external_deliveries": total_external_deliveries,

            "completed_internal_deliveries": completed_internal_deliveries,
            "completed_external_deliveries": completed_external_deliveries,

            # Reorder-level functionality has been removed.
            "low_stock_products": [],
        }

        return Response(data)
