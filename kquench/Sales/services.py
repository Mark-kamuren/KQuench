
from django.db import transaction
from rest_framework.exceptions import ValidationError

from .models import Sale

@transaction.atomic
def cancel_sale(sale_id):
    sale = Sale.objects.select_for_update().filter(
        pk=sale_id
    ).first()

    if sale is None:
        raise ValidationError('Sale not found.')

    if sale.sale_status == 'CANCELLED':
        raise ValidationError('This sale is already cancelled.')

    if sale.sale_status in ['PARTIALLY_DELIVERED', 'COMPLETED']:
        raise ValidationError(
            'A partially delivered or completed sale cannot be cancelled.'
        )

    if sale.payment_status == 'PAID':
        raise ValidationError(
            'A paid sale cannot be cancelled without a refund process.'
        )

    # A sale with an active delivery cannot be cancelled.
    from Distribution.models import Distribution

    active_deliveries = Distribution.objects.filter(
        sale=sale
    ).exclude(
        status='CANCELLED'
    )

    if active_deliveries.exists():
        raise ValidationError(
            'Cancel or resolve the associated deliveries before '
            'cancelling this sale.'
        )

    sale.sale_status = 'CANCELLED'
    sale.payment_status = 'CANCELLED'

    sale.save(
        update_fields=['sale_status', 'payment_status']
    )

    return sale