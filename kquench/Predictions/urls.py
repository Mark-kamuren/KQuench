from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import (
    DemandForecastViewSet,
    ForecastGenerationViewSet,
    PredictionRunViewSet, 
    PredictionViewSet
)

router = DefaultRouter()

router.register(
    "demand-forecasts",
    DemandForecastViewSet,
    basename="demand-forecasts",
)

urlpatterns = [
    path(
        "generate-forecast/",
        ForecastGenerationViewSet.as_view({"post": "create"}),
        name="generate-forecast",
    ),
    path("", include(router.urls)),
]

router.register('prediction-runs', PredictionRunViewSet)
router.register('predictions', PredictionViewSet)
