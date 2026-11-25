from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    DemandForecastViewSet,
    ForecastGenerationViewSet,
    PredictionRunViewSet,
    PredictionViewSet,
)

router = DefaultRouter()

router.register(
    "demand-forecasts",
    DemandForecastViewSet,
    basename="demand-forecasts",
)

router.register(
    "prediction-runs",
    PredictionRunViewSet,
    basename="prediction-runs",
)

router.register(
    "predictions",
    PredictionViewSet,
    basename="predictions",
)

urlpatterns = [
    path(
        "generate-forecast/",
        ForecastGenerationViewSet.as_view({"post": "create"}),
        name="generate-forecast",
    ),
    path("", include(router.urls)),
]