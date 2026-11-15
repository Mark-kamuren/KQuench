from django.db.models import Sum, F
from rest_framework import viewsets
from rest_framework.response import Response

from Production_inventory.models import (
    Product,
    SupplierReceipt,
    Inventory
)

from Sales.models import Sale

from Distribution.models import (
    Distribution,
    DistributionItem
)


class DashboardViewSet(viewsets.ViewSet):

    def list(self, request):

        total_products = Product.objects.filter(
            is_active=True
        ).count()

        total_stock = Inventory.objects.aggregate(
            total=Sum('quantity_available')
        )['total'] or 0

        total_supplier_receipts = SupplierReceipt.objects.count()

        total_units_received = SupplierReceipt.objects.aggregate(
            total=Sum('quantity_received')
        )['total'] or 0

        total_sales = Sale.objects.exclude(
            sale_status='CANCELLED'
        ).count()

        total_revenue = Sale.objects.filter(
            payment_status='PAID'
        ).exclude(
            sale_status='CANCELLED'
        ).aggregate(
            total=Sum('total_amount')
        )['total'] or 0

        pending_sales = Sale.objects.filter(
            sale_status='PENDING'
        ).count()

        internal_distributions = Distribution.objects.filter(
            distribution_type='INTERNAL'
        ).exclude(status='CANCELLED')

        external_distributions = Distribution.objects.filter(
            distribution_type='EXTERNAL'
        ).exclude(status='CANCELLED')

        internal_units = DistributionItem.objects.filter(
            distribution__distribution_type='INTERNAL',
            distribution__status__in=[
                'DISPATCHED',
                'IN_TRANSIT',
                'DELIVERED'
            ]
        ).aggregate(
            total=Sum('quantity_dispatched')
        )['total'] or 0

        completed_internal = internal_distributions.filter(
            status='DELIVERED'
        ).count()

        completed_external = external_distributions.filter(
            status='DELIVERED'
        ).count()

        low_stock = Inventory.objects.filter(
            quantity_available__lte=F('reorder_level')
        ).select_related('product')

        low_stock_products = [
            {
                'product_id': item.product.product_id,
                'product_name': item.product.product_name,
                'quantity_available': item.quantity_available,
                'reorder_level': item.reorder_level
            }
            for item in low_stock
        ]

        return Response({
            'total_products': total_products,
            'total_stock': total_stock,

            'total_supplier_receipts': total_supplier_receipts,
            'total_units_received': total_units_received,

            'total_sales': total_sales,
            'total_revenue': total_revenue,
            'pending_sales': pending_sales,

            'total_internal_distributions':
                internal_distributions.count(),

            'total_internal_units_distributed': internal_units,

            'total_external_deliveries':
                external_distributions.count(),

            'completed_internal_deliveries': completed_internal,
            'completed_external_deliveries': completed_external,

            'low_stock_products': low_stock_products
        })
