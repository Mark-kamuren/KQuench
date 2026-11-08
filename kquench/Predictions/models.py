from django.db import models


class PredictionRun(models.Model):
    run_id = models.BigAutoField(primary_key=True)
    model_name = models.CharField(max_length=100)
    model_version = models.CharField(max_length=50, blank=True)
    execution_date = models.DateTimeField(auto_now_add=True)
    evaluation_metrics = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'prediction_runs'
        ordering = ['-execution_date']

    def __str__(self):
        return f'{self.model_name} - Run #{self.run_id}'


class Prediction(models.Model):
    prediction_id = models.BigAutoField(primary_key=True)
    run = models.ForeignKey(
        PredictionRun,
        on_delete=models.CASCADE,
        related_name='predictions'
    )
    product = models.ForeignKey(
        'Production_inventory.Product',
        on_delete=models.PROTECT,
        related_name='predictions'
    )
    target_date = models.DateField()
    predicted_demand = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )
    predicted_inventory = models.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    class Meta:
        db_table = 'predictions'
        ordering = ['target_date']

    def __str__(self):
        return f'{self.product.product_name} - {self.target_date}'