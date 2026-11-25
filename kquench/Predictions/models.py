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

    
class DemandForecast(models.Model):

    TARGET_CHOICES = [
        ("total_demand_liters", "Total Demand"),
        ("aircraft_demand_liters", "Aircraft Demand"),
        ("cafe_demand_liters", "Cafe Demand"),
        ("lounge_demand_liters", "Lounge Demand"),
        ("external_demand_liters", "External Demand"),
    ]

    LEVEL_CHOICES = [
        ("LOW", "Low"),
        ("MEDIUM", "Medium"),
        ("HIGH", "High"),
    ]

    forecast_id = models.BigAutoField(primary_key=True)

    run = models.ForeignKey(
        PredictionRun,
        on_delete=models.PROTECT,
        related_name="demand_forecasts"
    )

    target_date = models.DateField()

    target_name = models.CharField(
        max_length=50,
        choices=TARGET_CHOICES
    )

    predicted_demand_liters = models.DecimalField(
        max_digits=14,
        decimal_places=2
    )

    demand_level = models.CharField(
        max_length=10,
        choices=LEVEL_CHOICES
    )

    class Meta:
        db_table = "demand_forecasts"
        ordering = ["target_date", "target_name"]
        constraints = [
            models.UniqueConstraint(
                fields=["run", "target_name"],
                name="unique_demand_forecast_per_run_target"
            )
        ]

    def __str__(self):
        return f"{self.target_name} - {self.target_date}"