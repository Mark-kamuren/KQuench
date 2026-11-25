from .models import PredictionRun, Prediction
from .serializers import PredictionRunSerializer, PredictionSerializer
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import DemandForecast
from .serializers import DemandForecastSerializer
from .forecast_service import generate_forecast


class DemandForecastViewSet(viewsets.ReadOnlyModelViewSet):

    queryset = DemandForecast.objects.select_related("run").all()

    serializer_class = DemandForecastSerializer
    permission_classes = [IsAuthenticated]


class ForecastGenerationViewSet(viewsets.ViewSet):

    permission_classes = [IsAuthenticated]

    def create(self, request):

        try:
            result = generate_forecast()

            return Response(
                result,
                status=status.HTTP_201_CREATED,
            )

        except ValueError as error:

            return Response(
                {"error": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception as error:

            return Response(
                {"error": str(error)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )



class PredictionRunViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PredictionRun.objects.all()
    serializer_class = PredictionRunSerializer


class PredictionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Prediction.objects.select_related('product', 'run')
    serializer_class = PredictionSerializer