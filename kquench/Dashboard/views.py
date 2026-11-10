from django.db.models import Sum, F
from rest_framework import viewsets
from rest_framework.response import Response

from Production_inventory.models import (
    Product,
    ProductionBatch,
    Inventory
)

from Sales.models import Sale
from Distribution.models import Distribution


class DashboardViewSet(viewsets.ViewSet):

    def list(self, request):

        total_products = Product.objects.filter(
            is_active=True
        ).count()

        total_stock = Inventory.objects.aggregate(
            total=Sum('quantity_available')
        )['total'] or 0

        total_batches = ProductionBatch.objects.count()

        total_produced = ProductionBatch.objects.aggregate(
            total=Sum('quantity_produced')
        )['total'] or 0

        total_sales = Sale.objects.count()

        total_revenue = Sale.objects.filter(
            payment_status='PAID'
        ).aggregate(
            total=Sum('total_amount')
        )['total'] or 0

        pending_sales = Sale.objects.filter(
            sale_status='PENDING'
        ).count()

        completed_deliveries = Distribution.objects.filter(
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
            'total_production_batches': total_batches,
            'total_units_produced': total_produced,
            'total_sales': total_sales,
            'total_revenue': total_revenue,
            'pending_sales': pending_sales,
            'completed_deliveries': completed_deliveries,
            'low_stock_products': low_stock_products
        })