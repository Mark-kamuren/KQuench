
import { useEffect, useState, type FormEvent } from "react";
import {
  RefreshCw,
  Plus,
  CheckCircle,
  Send,
} from "lucide-react";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

interface Destination {
  destination_id: number;
  destination_name: string;
  is_active?: boolean;
}

interface Product {
  product_id: number;
  product_name: string;
  unit_size_ml: number;
  is_active: boolean;
}

interface DistributionItem {
  product: number;
  product_name?: string;
  quantity_dispatched: number;
}

interface DistributionRecord {
  distribution_id: number;
  distribution_type: string;
  destination?: number | null;
  destination_name?: string;
  sale?: number | null;
  distribution_date: string;
  dispatch_date?: string | null;
  vehicle_number?: string;
  driver_name?: string;
  status: string;
  notes?: string;
  items: DistributionItem[];
}

function extractList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];

  if (
    data &&
    typeof data === "object" &&
    "results" in data &&
    Array.isArray(data.results)
  ) {
    return data.results as T[];
  }

  return [];
}

function errorMessage(error: any): string {
  const data = error?.response?.data;

  if (typeof data === "string") return data;
  if (data?.detail) return String(data.detail);
  if (data?.error) return String(data.error);

  if (data && typeof data === "object") {
    const firstValue = Object.values(data)[0];

    if (Array.isArray(firstValue)) {
      return String(firstValue[0]);
    }

    if (firstValue) return String(firstValue);
  }

  return "The operation could not be completed. Please try again.";
}

function statusClass(status: string): string {
  switch (status) {
    case "DELIVERED":
      return "bg-success";

    case "DISPATCHED":
    case "IN_TRANSIT":
      return "bg-info text-dark";

    case "CANCELLED":
      return "bg-secondary";

    default:
      return "bg-warning text-dark";
  }
}

export default function Distribution() {
  const { user } = useAuth();

  const canManage = [
    "ADMIN",
    "DISTRIBUTION_OFFICER",
  ].includes(user?.role || "");

  const [distributions, setDistributions] = useState<
    DistributionRecord[]
  >([]);

  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [destination, setDestination] = useState("");
  const [product, setProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [
        distributionResponse,
        destinationResponse,
        productResponse,
      ] = await Promise.all([
        api.get("distributions/"),
        api.get("destinations/"),
        api.get("products/"),
      ]);

      setDistributions(
        extractList<DistributionRecord>(distributionResponse.data)
      );

      setDestinations(
        extractList<Destination>(destinationResponse.data).filter(
          (item) => item.is_active !== false
        )
      );

      setProducts(
        extractList<Product>(productResponse.data).filter(
          (item) => item.is_active
        )
      );
    } catch (err: any) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const createDistribution = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!destination || !product) {
      setError("Select a destination and product.");
      return;
    }

    const dispatchedQuantity = Number(quantity);

    if (
      !Number.isInteger(dispatchedQuantity) ||
      dispatchedQuantity < 1
    ) {
      setError("Enter a valid quantity of at least one.");
      return;
    }

    setSubmitting(true);

    try {
      await api.post("distributions/", {
        distribution_type: "INTERNAL",
        destination: Number(destination),
        sale: null,
        distribution_date: new Date().toISOString(),
        vehicle_number: vehicleNumber.trim(),
        driver_name: driverName.trim(),
        notes: notes.trim(),
        items: [
          {
            product: Number(product),
            quantity_dispatched: dispatchedQuantity,
          },
        ],
      });

      setSuccess("Internal distribution created successfully.");

      setDestination("");
      setProduct("");
      setQuantity("");
      setVehicleNumber("");
      setDriverName("");
      setNotes("");

      await loadData();
    } catch (err: any) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const updateDistribution = async (
    distributionId: number,
    action: "dispatch" | "complete"
  ) => {
    setError("");
    setSuccess("");
    setActionId(distributionId);

    try {
      await api.post(
        `distributions/${distributionId}/${action}/`
      );

      setSuccess(
        action === "dispatch"
          ? "Distribution dispatched successfully."
          : "Delivery marked as delivered successfully."
      );

      await loadData();
    } catch (err: any) {
      setError(errorMessage(err));
    } finally {
      setActionId(null);
    }
  };

  const totalInternal = distributions.filter(
    (item) => item.distribution_type === "INTERNAL"
  ).length;

  const delivered = distributions.filter(
    (item) => item.status === "DELIVERED"
  ).length;

  const formatDate = (date: string) => {
    if (!date) return "—";

    const parsedDate = new Date(date);

    return Number.isNaN(parsedDate.getTime())
      ? "—"
      : parsedDate.toLocaleDateString("en-KE");
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div
          className="spinner-border text-primary"
          role="status"
          aria-label="Loading"
        />
        <p className="text-secondary mt-3">
          Loading distributions...
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Page heading */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">
            Distribution Management
          </h2>
          <p className="text-secondary mb-0">
            Manage internal water deliveries to airline destinations.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-primary btn-sm"
          onClick={() => void loadData()}
        >
          <RefreshCw size={15} className="me-2" />
          Refresh
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="alert alert-danger alert-dismissible">
          {error}
          <button
            type="button"
            className="btn-close"
            onClick={() => setError("")}
            aria-label="Dismiss"
          />
        </div>
      )}

      {success && (
        <div className="alert alert-success alert-dismissible">
          {success}
          <button
            type="button"
            className="btn-close"
            onClick={() => setSuccess("")}
            aria-label="Dismiss"
          />
        </div>
      )}

      {/* Summary cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <div className="text-secondary small">
                Total Distributions
              </div>
              <h3 className="fw-bold mb-0">
                {distributions.length.toLocaleString("en-KE")}
              </h3>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <div className="text-secondary small">
                Internal Distributions
              </div>
              <h3 className="fw-bold mb-0">
                {totalInternal.toLocaleString("en-KE")}
              </h3>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <div className="text-secondary small">
                Delivered
              </div>
              <h3 className="fw-bold mb-0">
                {delivered.toLocaleString("en-KE")}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Create internal distribution */}
      {canManage && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-4">
            <h5 className="fw-bold mb-3">
              <Plus size={18} className="me-2" />
              Create Internal Distribution
            </h5>

            <form
              onSubmit={createDistribution}
              className="row g-3"
            >
              <div className="col-12 col-md-4">
                <label className="form-label">
                  Destination
                </label>

                <select
                  className="form-select"
                  value={destination}
                  onChange={(event) =>
                    setDestination(event.target.value)
                  }
                  required
                >
                  <option value="">
                    Select destination
                  </option>

                  {destinations.map((item) => (
                    <option
                      key={item.destination_id}
                      value={item.destination_id}
                    >
                      {item.destination_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">
                  Product
                </label>

                <select
                  className="form-select"
                  value={product}
                  onChange={(event) =>
                    setProduct(event.target.value)
                  }
                  required
                >
                  <option value="">
                    Select product
                  </option>

                  {products.map((item) => (
                    <option
                      key={item.product_id}
                      value={item.product_id}
                    >
                      {item.product_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">
                  Quantity to Dispatch
                </label>

                <input
                  type="number"
                  className="form-control"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(event.target.value)
                  }
                  required
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">
                  Vehicle Number
                </label>

                <input
                  type="text"
                  className="form-control"
                  value={vehicleNumber}
                  onChange={(event) =>
                    setVehicleNumber(event.target.value)
                  }
                  placeholder="Enter vehicle registration"
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">
                  Driver Name
                </label>

                <input
                  type="text"
                  className="form-control"
                  value={driverName}
                  onChange={(event) =>
                    setDriverName(event.target.value)
                  }
                  placeholder="Enter driver name"
                />
              </div>

              <div className="col-12">
                <label className="form-label">
                  Notes
                </label>

                <textarea
                  className="form-control"
                  rows={2}
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                  placeholder="Optional distribution notes"
                />
              </div>

              <div className="col-12">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    submitting ||
                    destinations.length === 0 ||
                    products.length === 0
                  }
                >
                  <Plus size={16} className="me-2" />

                  {submitting
                    ? "Creating..."
                    : "Create Distribution"}
                </button>
              </div>

              {destinations.length === 0 && (
                <div className="col-12">
                  <p className="text-warning small mb-0">
                    No active destinations are available.
                  </p>
                </div>
              )}

              {products.length === 0 && (
                <div className="col-12">
                  <p className="text-warning small mb-0">
                    No active products are available.
                  </p>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Distribution records */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-3 p-md-4">
          <h5 className="fw-bold mb-3">
            Distribution Records
          </h5>

          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Reference</th>
                  <th>Type</th>
                  <th>Destination</th>
                  <th>Items</th>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Date</th>
                  <th>Status</th>
                  {canManage && <th>Actions</th>}
                </tr>
              </thead>

              <tbody>
                {distributions.map((item) => (
                  <tr key={item.distribution_id}>
                    <td className="fw-semibold">
                      #{item.distribution_id}
                    </td>

                    <td>
                      {item.distribution_type}
                    </td>

                    <td>
                      {item.destination_name ||
                        (item.distribution_type === "EXTERNAL"
                          ? `Sale #${item.sale ?? "—"}`
                          : "—")}
                    </td>

                    <td>
                      {item.items?.length ? (
                        item.items.map((entry, index) => (
                          <div
                            key={`${entry.product}-${index}`}
                          >
                            {entry.product_name ||
                              `Product ${entry.product}`}
                            {" × "}
                            {entry.quantity_dispatched.toLocaleString(
                              "en-KE"
                            )}
                          </div>
                        ))
                      ) : (
                        "—"
                      )}
                    </td>

                    <td>
                      {item.vehicle_number || "—"}
                    </td>

                    <td>
                      {item.driver_name || "—"}
                    </td>

                    <td>
                      {formatDate(item.distribution_date)}
                    </td>

                    <td>
                      <span
                        className={`badge ${statusClass(
                          item.status
                        )}`}
                      >
                        {item.status.replaceAll("_", " ")}
                      </span>
                    </td>

                    {canManage && (
                      <td>
                        <div className="d-flex flex-wrap gap-2">
                          {item.status === "PENDING" && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              disabled={
                                actionId === item.distribution_id
                              }
                              onClick={() =>
                                void updateDistribution(
                                  item.distribution_id,
                                  "dispatch"
                                )
                              }
                            >
                              <Send
                                size={14}
                                className="me-1"
                              />
                              Dispatch
                            </button>
                          )}

                          {(item.status === "DISPATCHED" ||
                            item.status === "IN_TRANSIT") && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success"
                              disabled={
                                actionId === item.distribution_id
                              }
                              onClick={() =>
                                void updateDistribution(
                                  item.distribution_id,
                                  "complete"
                                )
                              }
                            >
                              <CheckCircle
                                size={14}
                                className="me-1"
                              />
                              Mark Delivered
                            </button>
                          )}

                          {actionId === item.distribution_id && (
                            <span className="small text-secondary">
                              Updating...
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}

                {distributions.length === 0 && (
                  <tr>
                    <td
                      colSpan={canManage ? 9 : 8}
                      className="text-center text-secondary py-4"
                    >
                      No distribution records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
