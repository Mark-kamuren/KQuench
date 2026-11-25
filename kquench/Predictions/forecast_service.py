
from decimal import Decimal
from django.db import transaction

import numpy as np

from Predictions.models import PredictionRun, DemandForecast
from Predictions.model_loader import get_model_bundle

from Predictions.feature_engineering import (
    extract_daily_demand,
    build_forecast_features,
)


TARGET_MAPPING = {
    "Total": "total_demand_liters",
    "Aircraft": "aircraft_demand_liters",
    "Cafe": "cafe_demand_liters",
    "Lounge": "lounge_demand_liters",
    "External": "external_demand_liters",
}

CHANNEL_TARGETS = [
    "Aircraft",
    "Cafe",
    "Lounge",
    "External",
]

MODEL_NAME = "KQuench Hybrid Forecasting"


def predict_regression(bundle, target, features):

    models = bundle["regression_models"][target]
    weights = bundle["regression_weights"][target]

    prediction = 0.0
    total_weight = 0.0

    for model_name, weight in weights.items():

        if weight <= 0:
            continue

        estimator = models[model_name]

        result = estimator.predict(features)

        prediction += float(result[0]) * float(weight)
        total_weight += float(weight)

    if total_weight == 0:
        raise ValueError(
            f"No regression ensemble weights for {target}"
        )

    return max(0.0, prediction / total_weight)


def predict_classification(bundle, target, features):

    models = bundle["classification_models"][target]
    weights = bundle["classification_weights"][target]

    probabilities = np.zeros(3, dtype=float)
    total_weight = 0.0

    for model_name, weight in weights.items():

        if weight <= 0:
            continue

        estimator = models[model_name]

        model_probabilities = estimator.predict_proba(features)[0]

        for class_value, probability in zip(
            estimator.classes_,
            model_probabilities,
        ):

            class_index = int(class_value)

            if class_index in [0, 1, 2]:
                probabilities[class_index] += (
                    float(weight) * float(probability)
                )

        total_weight += float(weight)

    if total_weight == 0:
        raise ValueError(
            f"No classification ensemble weights for {target}"
        )

    probabilities /= total_weight

    predicted_class = int(np.argmax(probabilities))

    class_names = bundle["class_names"]

    # Handle either integer or string dictionary keys.
    level = class_names.get(
        predicted_class,
        class_names.get(str(predicted_class)),
    )

    if not level:
        raise ValueError(
            f"Unknown classification level: {predicted_class}"
        )

    return str(level).upper()


@transaction.atomic
def generate_forecast():

    bundle = get_model_bundle()

    history = extract_daily_demand()

    features, forecast_date = build_forecast_features(
        history,
        bundle["feature_columns"],
    )

    regression_predictions = {}
    classification_predictions = {}

    # Generate all five target predictions.
    for target in bundle["targets"]:

        regression_predictions[target] = predict_regression(
            bundle,
            target,
            features,
        )

        classification_predictions[target] = (
            predict_classification(
                bundle,
                target,
                features,
            )
        )

    # Reconcile the four channel forecasts to total demand.
    total_prediction = regression_predictions["Total"]

    channel_sum = sum(
        regression_predictions[target]
        for target in CHANNEL_TARGETS
    )

    if channel_sum > 0:

        scale_factor = total_prediction / channel_sum

        for target in CHANNEL_TARGETS:
            regression_predictions[target] *= scale_factor

    # Create a record of this forecasting run.
    metadata = bundle["metadata"]

    training_versions = metadata.get(
        "training_versions",
        {},
    )

    model_version = (
        f"numpy-{training_versions.get('numpy', 'unknown')};"
        f"sklearn-{training_versions.get('sklearn', 'unknown')};"
        f"xgboost-{training_versions.get('xgboost', 'unknown')}"
    )[:50]

    run = PredictionRun.objects.create(
        model_name=MODEL_NAME,
        model_version=model_version,
        evaluation_metrics={
            "approach": "Hybrid classification and regression",
            "forecast_horizon": "Next day",
            "data_type": "Synthetic-trained prototype",
            "reconciliation": (
                "Proportional channel scaling to total forecast"
            ),
        },
    )

    forecast_records = []

    for target, database_target in TARGET_MAPPING.items():

        predicted_value = max(
            0.0,
            regression_predictions[target],
        )

        forecast_records.append(
            DemandForecast(
                run=run,
                target_date=forecast_date,
                target_name=database_target,
                predicted_demand_liters=Decimal(
                    str(round(predicted_value, 2))
                ),
                demand_level=classification_predictions[target],
            )
        )

    DemandForecast.objects.bulk_create(forecast_records)

    return {
        "run_id": run.run_id,
        "forecast_date": forecast_date.isoformat(),
        "model_name": MODEL_NAME,
        "model_version": model_version,
        "data_type": "Synthetic-trained prototype",
        "forecasts": [
            {
                "target": target,
                "target_name": TARGET_MAPPING[target],
                "predicted_demand_liters": round(
                    regression_predictions[target],
                    2,
                ),
                "demand_level": classification_predictions[target],
            }
            for target in TARGET_MAPPING
        ],
    }
