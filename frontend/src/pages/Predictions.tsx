
import { useCallback, useEffect, useState } from "react";
import api from "../services/api";

interface Forecast {
  forecast_id: number;
  run: number;
  target_date: string;
  target_name: string;
  predicted_demand_liters: string | number;
  demand_level: "LOW" | "MEDIUM" | "HIGH";
}

interface ForecastResult {
  run_id: number;
  forecast_date: string;
  model_name: string;
  model_version: string;
  data_type: string;
  forecasts: {
    target: string;
    target_name: string;
    predicted_demand_liters: number;
    demand_level: "LOW" | "MEDIUM" | "HIGH";
  }[];
}

interface ForecastGroup {
  run: number;
  date: string;
  total: number;
  aircraft: number;
  cafe: number;
  lounge: number;
  external: number;
  level: string;
  forecastId: number;
}

const numberFormat = new Intl.NumberFormat("en-KE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatLitres(value: number) {
  return `${numberFormat.format(value)} L`;
}

function levelClass(level: string) {
  switch (level?.toUpperCase()) {
    case "LOW":
      return "bg-success-subtle text-success";
    case "HIGH":
      return "bg-danger-subtle text-danger";
    default:
      return "bg-warning-subtle text-warning-emphasis";
  }
}

function groupForecasts(records: Forecast[]): ForecastGroup[] {
  const groups = new Map<string, ForecastGroup>();

  records.forEach((record) => {
    const key = `${record.run}-${record.target_date}`;

    if (!groups.has(key)) {
      groups.set(key, {
        run: record.run,
        date: record.target_date,
        total: 0,
        aircraft: 0,
        cafe: 0,
        lounge: 0,
        external: 0,
        level: "MEDIUM",
        forecastId: record.forecast_id,
      });
    }

    const group = groups.get(key)!;
    const value = Number(record.predicted_demand_liters) || 0;

    switch (record.target_name) {
      case "total_demand_liters":
        group.total = value;
        group.level = record.demand_level;
        break;
      case "aircraft_demand_liters":
        group.aircraft = value;
        break;
      case "cafe_demand_liters":
        group.cafe = value;
        break;
      case "lounge_demand_liters":
        group.lounge = value;
        break;
      case "external_demand_liters":
        group.external = value;
        break;
    }

    group.forecastId = Math.max(
      group.forecastId,
      record.forecast_id
    );
  });

  return Array.from(groups.values()).sort(
    (a, b) => b.forecastId - a.forecastId
  );
}

export default function Predictions() {
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [latestResult, setLatestResult] =
    useState<ForecastResult | null>(null);

  const loadForecasts = useCallback(async () => {
    try {
      setError("");

      const response = await api.get("demand-forecasts/");
      const data = response.data;

      setForecasts(
        Array.isArray(data) ? data : data.results || []
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Unable to load saved forecasts."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadForecasts();
  }, [loadForecasts]);

  const history = groupForecasts(forecasts);
  const latest = history[0];

  async function handleGenerateForecast() {
    try {
      setGenerating(true);
      setError("");
      setSuccess("");
      setLatestResult(null);

      const response = await api.post<ForecastResult>(
        "generate-forecast/",
        {}
      );

      setLatestResult(response.data);
      setSuccess(
        `Forecast successfully generated for ${response.data.forecast_date}.`
      );

      await loadForecasts();
    } catch (err: any) {
      const data = err?.response?.data;

      setError(
        data?.error ||
          data?.detail ||
          "Forecast generation failed. Please try again."
      );
    } finally {
      setGenerating(false);
    }
  }

  const displayForecasts = latestResult?.forecasts;

  const getLatestValue = (
    targetName: string,
    fallback: number
  ) => {
    const item = displayForecasts?.find(
      (forecast) => forecast.target_name === targetName
    );

    return item
      ? item.predicted_demand_liters
      : fallback;
  };

  const getLatestLevel = (
    targetName: string,
    fallback: string
  ) => {
    const item = displayForecasts?.find(
      (forecast) => forecast.target_name === targetName
    );

    return item ? item.demand_level : fallback;
  };

  const totalDemand = getLatestValue(
    "total_demand_liters",
    latest?.total || 0
  );

  const categories = [
    {
      label: "Aircraft",
      target: "aircraft_demand_liters",
      value: getLatestValue(
        "aircraft_demand_liters",
        latest?.aircraft || 0
      ),
      color: "bg-primary",
    },
    {
      label: "Cafe",
      target: "cafe_demand_liters",
      value: getLatestValue(
        "cafe_demand_liters",
        latest?.cafe || 0
      ),
      color: "bg-info",
    },
    {
      label: "Lounge",
      target: "lounge_demand_liters",
      value: getLatestValue(
        "lounge_demand_liters",
        latest?.lounge || 0
      ),
      color: "bg-warning",
    },
    {
      label: "External Sales",
      target: "external_demand_liters",
      value: getLatestValue(
        "external_demand_liters",
        latest?.external || 0
      ),
      color: "bg-success",
    },
  ];

  const latestDate =
    latestResult?.forecast_date || latest?.date;

  const totalLevel = getLatestLevel(
    "total_demand_liters",
    latest?.level || "MEDIUM"
  );

  return (
    <div className="container-fluid px-0">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold mb-1">
            Predictive Analysis
          </h3>
          <p className="text-muted mb-0">
            Bottled water demand forecasting and operational planning.
          </p>
        </div>

        <button
          className="btn btn-primary d-flex align-items-center justify-content-center gap-2"
          onClick={handleGenerateForecast}
          disabled={generating || loading}
        >
          {generating ? (
            <>
              <span className="spinner-border spinner-border-sm" />
              Generating Forecast...
            </>
          ) : (
            <>
              <i className="bi bi-stars" />
              Generate Forecast
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success" role="alert">
          {success}
        </div>
      )}

      {loading ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary mb-3" />
            <p className="text-muted mb-0">
              Loading forecast information...
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <p className="text-muted small mb-2">
                    Total Predicted Demand
                  </p>
                  <h4 className="fw-bold mb-1">
                    {formatLitres(totalDemand)}
                  </h4>
                  <small className="text-muted">
                    Across all demand categories
                  </small>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <p className="text-muted small mb-2">
                    Forecast Date
                  </p>
                  <h5 className="fw-bold mb-1">
                    {latestDate || "Not available"}
                  </h5>
                  <small className="text-muted">
                    Next-day forecast
                  </small>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <p className="text-muted small mb-2">
                    Overall Demand Level
                  </p>
                  <h5 className="mb-2">
                    <span
                      className={`badge ${levelClass(totalLevel)}`}
                    >
                      {totalLevel}
                    </span>
                  </h5>
                  <small className="text-muted">
                    Based on the classification model
                  </small>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <p className="text-muted small mb-2">
                    Forecast Runs
                  </p>
                  <h4 className="fw-bold mb-1">
                    {history.length}
                  </h4>
                  <small className="text-muted">
                    Saved forecasting runs
                  </small>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-12 col-xl-8">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">
                  <h5 className="fw-bold mb-1">
                    Predicted Demand by Category
                  </h5>
                  <p className="text-muted small mb-4">
                    Forecasted bottled water requirements in litres.
                  </p>

                  {latest ? (
                    categories.map((category) => {
                      const percentage =
                        totalDemand > 0
                          ? Math.min(
                              100,
                              (category.value / totalDemand) * 100
                            )
                          : 0;

                      return (
                        <div
                          key={category.target}
                          className="mb-4"
                        >
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="fw-semibold">
                              {category.label}
                            </span>
                            <span className="text-muted small">
                              {formatLitres(category.value)}
                            </span>
                          </div>

                          <div
                            className="progress"
                            style={{ height: 10 }}
                          >
                            <div
                              className={`progress-bar ${category.color}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>

                          <small className="text-muted">
                            {percentage.toFixed(1)}% of total demand
                          </small>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-5">
                      <p className="text-muted mb-0">
                        No forecasts available. Generate your first forecast.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-12 col-xl-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">
                  <h5 className="fw-bold mb-3">
                    Model Information
                  </h5>

                  <div className="mb-3">
                    <small className="text-muted d-block">
                      Model
                    </small>
                    <strong>
                      {latestResult?.model_name ||
                        "KQuench Hybrid Forecasting"}
                    </strong>
                  </div>

                  <div className="mb-3">
                    <small className="text-muted d-block">
                      Forecast Horizon
                    </small>
                    <strong>Next day</strong>
                  </div>

                  <div className="mb-3">
                    <small className="text-muted d-block">
                      Prediction Approach
                    </small>
                    <strong>Regression + Classification</strong>
                  </div>

                  <div className="mb-3">
                    <small className="text-muted d-block">
                      Model Version
                    </small>
                    <strong className="small">
                      {latestResult?.model_version ||
                        "Trained model"}
                    </strong>
                  </div>

                  <div>
                    <small className="text-muted d-block">
                      Training Data
                    </small>
                    <span className="badge bg-warning-subtle text-warning-emphasis">
                      Synthetic-trained prototype
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-body p-0">
              <div className="p-4 border-bottom">
                <h5 className="fw-bold mb-1">
                  Forecast History
                </h5>
                <p className="text-muted small mb-0">
                  Previously generated demand predictions.
                </p>
              </div>

              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-4">Run ID</th>
                      <th>Forecast Date</th>
                      <th>Total Demand</th>
                      <th>Aircraft</th>
                      <th>Cafe</th>
                      <th>Lounge</th>
                      <th>External</th>
                      <th>Demand Level</th>
                    </tr>
                  </thead>

                  <tbody>
                    {history.length > 0 ? (
                      history.map((item) => (
                        <tr key={`${item.run}-${item.date}`}>
                          <td className="ps-4 fw-semibold">
                            #{item.run}
                          </td>
                          <td>{item.date}</td>
                          <td className="fw-semibold">
                            {formatLitres(item.total)}
                          </td>
                          <td>{formatLitres(item.aircraft)}</td>
                          <td>{formatLitres(item.cafe)}</td>
                          <td>{formatLitres(item.lounge)}</td>
                          <td>{formatLitres(item.external)}</td>
                          <td>
                            <span
                              className={`badge ${levelClass(item.level)}`}
                            >
                              {item.level}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={8}
                          className="text-center text-muted py-5"
                        >
                          No forecast history found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="alert alert-warning mt-4 mb-0">
            <strong>Prototype notice:</strong> Forecasts currently use
            synthetically trained machine-learning models. Predictions
            should be treated as prototype estimates until validated
            against representative operational data.
          </div>
        </>
      )}
    </div>
  );
}
