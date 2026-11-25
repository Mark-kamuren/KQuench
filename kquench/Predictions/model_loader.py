
import json
from functools import lru_cache
from pathlib import Path

import joblib
from xgboost import XGBRegressor, XGBClassifier


MODEL_DIR = (
    Path(__file__).resolve().parent
    / "saved_models"
    / "kquench_saved_models"
)

METADATA_PATH = MODEL_DIR / "metadata.json"


def load_estimator(model_info):
    """Load one estimator from its saved model file."""

    model_path = MODEL_DIR / model_info["path"]

    if not model_path.exists():
        raise FileNotFoundError(
            f"Model file not found: {model_path}"
        )

    model_format = model_info["format"]
    estimator_class = model_info["estimator_class"]

    if model_format == "joblib":
        return joblib.load(model_path)

    if model_format == "ubj":
        if estimator_class == "XGBRegressor":
            estimator = XGBRegressor()
        elif estimator_class == "XGBClassifier":
            estimator = XGBClassifier()
        else:
            raise ValueError(
                f"Unsupported XGBoost estimator: {estimator_class}"
            )

        estimator.load_model(str(model_path))
        return estimator

    raise ValueError(f"Unsupported model format: {model_format}")


@lru_cache(maxsize=1)
def get_model_bundle():
    """
    Load all regression and classification estimators.
    Models remain cached for subsequent API requests.
    """

    if not METADATA_PATH.exists():
        raise FileNotFoundError(
            f"Model metadata not found: {METADATA_PATH}"
        )

    with open(METADATA_PATH, "r", encoding="utf-8") as file:
        metadata = json.load(file)

    feature_columns = metadata["feature_columns"]

    if len(feature_columns) != 57:
        raise ValueError(
            f"Expected 57 features, found {len(feature_columns)}"
        )

    loaded_models = {
        "regression": {},
        "classification": {}
    }

    for model_type in ("regression", "classification"):

        model_definitions = metadata[model_type]["models"]

        for target, algorithms in model_definitions.items():

            loaded_models[model_type][target] = {}

            for algorithm, model_info in algorithms.items():

                loaded_models[model_type][target][algorithm] = (
                    load_estimator(model_info)
                )

    return {
        "metadata": metadata,
        "feature_columns": feature_columns,
        "targets": metadata["target_names"],
        "regression_models": loaded_models["regression"],
        "classification_models": loaded_models["classification"],
        "regression_weights": metadata["regression"]["ensemble_weights"],
        "classification_weights": metadata["classification"]["ensemble_weights"],
        "class_thresholds": metadata["classification"]["class_thresholds"],
        "class_names": metadata["classification"]["class_names"],
    }


def clear_model_cache():
    """Clear cached estimators when model files are replaced."""
    get_model_bundle.cache_clear()
