from django.db.models import Sum, F
from rest_framework import viewsets
from rest_framework.response import Response

from Production_inventory.models import (
    Product,
    SupplierReceipt,
    Inventory,
)
from Sales.models import Sale
from Distribution.models import Distribution, DistributionItem


class DashboardViewSet(viewsets.ViewSet):

    def list(self, request):

        active_products = Product.objects.filter(is_active=True)

        total_stock = (
            Inventory.objects.aggregate(
                total=Sum('quantity_available')
            )['total'] or 0
        )

        receipt_stats = SupplierReceipt.objects.aggregate(
            total_receipts=Sum('quantity_received'),
        )

        total_supplier_receipts = SupplierReceipt.objects.count()

        total_units_received = (
            receipt_stats['total_receipts'] or 0
        )

        valid_sales = Sale.objects.exclude(
            sale_status='CANCELLED'
        )

        total_sales = valid_sales.count()

        total_revenue = (
            Sale.objects.filter(
                payment_status='PAID'
            ).exclude(
                sale_status='CANCELLED'
            ).aggregate(
                total=Sum('total_amount')
            )['total'] or 0
        )

        pending_sales = Sale.objects.filter(
            sale_status='PENDING'
        ).count()

        valid_distributions = Distribution.objects.exclude(
            status='CANCELLED'
        )

        total_internal_distributions = (
            valid_distributions.filter(
                distribution_type='INTERNAL'
            ).count()
        )

        completed_internal_deliveries = (
            Distribution.objects.filter(
                distribution_type='INTERNAL',
                status='DELIVERED'
            ).count()
        )

        completed_external_deliveries = (
            Distribution.objects.filter(
                distribution_type='EXTERNAL',
                status='DELIVERED'
            ).count()
        )

        total_external_deliveries = (
            valid_distributions.filter(
                distribution_type='EXTERNAL'
            ).count()
        )

        delivered_statuses = [
            'DISPATCHED',
            'IN_TRANSIT',
            'DELIVERED',
        ]

        total_internal_units_distributed = (
            DistributionItem.objects.filter(
                distribution__distribution_type='INTERNAL',
                distribution__status__in=delivered_statuses
            ).aggregate(
                total=Sum('quantity_dispatched')
            )['total'] or 0
        )

        low_stock = Inventory.objects.filter(
            quantity_available__lte=F('reorder_level')
        ).select_related('product')

        low_stock_products = [
            {
                'product_id': item.product.product_id,
                'product_name': item.product.product_name,
                'quantity_available': item.quantity_available,
                'reorder_level': item.reorder_level,
            }
            for item in low_stock
        ]

        data = {
            'total_products': active_products.count(),
            'total_stock': total_stock,
            'total_supplier_receipts': total_supplier_receipts,
            'total_units_received': total_units_received,
            'total_sales': total_sales,
            'total_revenue': total_revenue,
            'pending_sales': pending_sales,
            'total_internal_distributions': total_internal_distributions,
            'total_internal_units_distributed': total_internal_units_distributed,
            'total_external_deliveries': total_external_deliveries,
            'completed_internal_deliveries': completed_internal_deliveries,
            'completed_external_deliveries': completed_external_deliveries,
            'low_stock_products': low_stock_products,
        }

        return Response(data)
