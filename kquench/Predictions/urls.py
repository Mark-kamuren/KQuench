from rest_framework.routers import DefaultRouter
from .views import PredictionRunViewSet, PredictionViewSet

router = DefaultRouter()
router.register('prediction-runs', PredictionRunViewSet)
router.register('predictions', PredictionViewSet)

urlpatterns = router.urls