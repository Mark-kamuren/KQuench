from datetime import date
import math
import pandas as pd
from django.utils import timezone
from Distribution.models import Distribution


TARGET_COLUMNS = [
    "total_demand_liters",
    "aircraft_demand_liters",
    "cafe_demand_liters",
    "lounge_demand_liters",
    "external_demand_liters",
]

VALID_STATUSES = ["DISPATCHED", "IN_TRANSIT", "DELIVERED"]

DESTINATION_MAPPING = {
    "AIRCRAFT": "aircraft_demand_liters",
    "CAFE": "cafe_demand_liters",
    "LOUNGE": "lounge_demand_liters",
}


def extract_daily_demand():
    """
    Extract actual dispatched demand and convert quantities to litres.
    """

    distributions = (
        Distribution.objects
        .filter(
            status__in=VALID_STATUSES,
            dispatch_date__isnull=False,
        )
        .select_related("destination")
        .prefetch_related(
            "items__product",
            "items__sale_item__product",
        )
    )

    daily_data = {}

    for distribution in distributions:

        dispatch_date = distribution.dispatch_date

        if timezone.is_aware(dispatch_date):
            dispatch_date = timezone.localtime(dispatch_date)

        day = dispatch_date.date()

        if day not in daily_data:
            daily_data[day] = {
                column: 0.0 for column in TARGET_COLUMNS
            }

        for item in distribution.items.all():

            if distribution.distribution_type == "INTERNAL":

                destination = distribution.destination

                if not destination:
                    continue

                target = DESTINATION_MAPPING.get(
                    destination.destination_type
                )

                # Exclude AIRLINE_OPERATIONS and OTHER.
                if not target:
                    continue

                product = item.product

            elif distribution.distribution_type == "EXTERNAL":

                target = "external_demand_liters"

                if not item.sale_item:
                    continue

                product = item.sale_item.product

            else:
                continue

            if not product:
                continue

            litres = (
                item.quantity_dispatched * product.unit_size_ml
            ) / 1000.0

            daily_data[day][target] += litres

    if not daily_data:
        raise ValueError(
            "No dispatched distribution records were found. "
            "Create and dispatch demo distributions before forecasting."
        )

    # Create a continuous daily date range.
    first_date = min(daily_data.keys())
    last_date = max(daily_data.keys())

    date_range = pd.date_range(
        start=first_date,
        end=last_date,
        freq="D",
    )

    records = []

    for timestamp in date_range:

        day = timestamp.date()

        values = daily_data.get(
            day,
            {column: 0.0 for column in TARGET_COLUMNS},
        )

        # Total demand is the sum of the four supported channels.
        total = sum(
            values[column]
            for column in TARGET_COLUMNS[1:]
        )

        records.append({
            "date": day,
            "total_demand_liters": total,
            "aircraft_demand_liters": values[
                "aircraft_demand_liters"
            ],
            "cafe_demand_liters": values[
                "cafe_demand_liters"
            ],
            "lounge_demand_liters": values[
                "lounge_demand_liters"
            ],
            "external_demand_liters": values[
                "external_demand_liters"
            ],
        })

    dataframe = pd.DataFrame(records)

    dataframe.set_index("date", inplace=True)

    return dataframe


def build_forecast_features(history, feature_columns):
    """
    Construct the exact 57 model features for the next day.
    """

    if len(history) < 28:
        raise ValueError(
            "At least 28 consecutive calendar days of history "
            "are required to generate a forecast."
        )

    history = history.sort_index()

    last_date = history.index[-1]
    forecast_date = last_date + pd.Timedelta(days=1)

    features = {}

    # Calendar features.
    features["forecast_day_of_week"] = forecast_date.dayofweek
    features["forecast_month"] = forecast_date.month
    features["forecast_day"] = forecast_date.day
    features["forecast_day_of_year"] = forecast_date.dayofyear
    features["forecast_is_weekend"] = int(
        forecast_date.dayofweek >= 5
    )

    month_angle = 2 * math.pi * forecast_date.month / 12
    dow_angle = 2 * math.pi * forecast_date.dayofweek / 7
    doy_angle = 2 * math.pi * forecast_date.dayofyear / 365.25

    features["forecast_month_sin"] = math.sin(month_angle)
    features["forecast_month_cos"] = math.cos(month_angle)

    features["forecast_dow_sin"] = math.sin(dow_angle)
    features["forecast_dow_cos"] = math.cos(dow_angle)

    features["forecast_doy_sin"] = math.sin(doy_angle)
    features["forecast_doy_cos"] = math.cos(doy_angle)

    # Match the original training time scale.
    training_start = date(1944, 1, 1)

    features["time_index"] = (
        forecast_date.date() - training_start
    ).days

    # Lag and rolling features.
    lag_days = {
        "prev_day": 0,
        "two_days_before_forecast": 1,
        "three_days_before_forecast": 2,
        "seven_days_before_forecast": 6,
        "fourteen_days_before_forecast": 13,
        "twenty_eight_days_before_forecast": 27,
    }

    for target in TARGET_COLUMNS:

        for suffix, offset in lag_days.items():

            historical_date = last_date - pd.Timedelta(
                days=offset
            )

            features[f"{target}_{suffix}"] = float(
                history.loc[historical_date, target]
            )

        for window in [7, 14, 28]:

            features[f"{target}_rolling_mean_{window}"] = float(
                history[target].tail(window).mean()
            )

    # Preserve the exact order used during model training.
    missing_features = [
        column for column in feature_columns
        if column not in features
    ]

    if missing_features:
        raise ValueError(
            f"Missing model features: {missing_features}"
        )

    feature_frame = pd.DataFrame(
        [[features[column] for column in feature_columns]],
        columns=feature_columns,
    )

    return feature_frame, forecast_date.date()
