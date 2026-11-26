
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

interface SaleItem {
  sale_item_id: number;
  product: number;
  product_name: string;
  quantity: number;
  unit_price: number | string;
  subtotal: number | string;
}

interface Sale {
  sale_id: number;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  total_amount: number | string;
  payment_status: string;
  sale_status: string;
  sale_date: string;
  items: SaleItem[];
}

interface DistributionItem {
  product: number;
  product_name?: string;
  sale_item?: number | null;
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

function formatAmount(amount: number | string): string {
  return `KES ${Number(amount).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
  const [sales, setSales] = useState<Sale[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Internal distribution form
  const [destination, setDestination] = useState("");
  const [product, setProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [notes, setNotes] = useState("");

  // External distribution form
  const [selectedSaleId, setSelectedSaleId] = useState("");
  const [externalQuantities, setExternalQuantities] = useState<
    Record<number, string>
  >({});
  const [externalVehicle, setExternalVehicle] = useState("");
  const [externalDriver, setExternalDriver] = useState("");
  const [externalNotes, setExternalNotes] = useState("");

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
        salesResponse,
      ] = await Promise.all([
        api.get("distributions/"),
        api.get("destinations/"),
        api.get("products/"),
        api.get("sales/"),
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

      setSales(extractList<Sale>(salesResponse.data));
    } catch (err: any) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Calculate quantities already reserved or dispatched for a sale item.
  // Pending distributions are included to avoid creating duplicate orders.
  const getOutstandingQuantity = (saleItem: SaleItem): number => {
    const allocated = distributions.reduce((total, distribution) => {
      if (
        distribution.distribution_type !== "EXTERNAL" ||
        distribution.status === "CANCELLED"
      ) {
        return total;
      }

      const allocatedForItem = (distribution.items || [])
        .filter(
          (item) => item.sale_item === saleItem.sale_item_id
        )
        .reduce(
          (sum, item) => sum + Number(item.quantity_dispatched),
          0
        );

      return total + allocatedForItem;
    }, 0);

    return Math.max(0, saleItem.quantity - allocated);
  };

  const eligibleSales = sales.filter((sale) => {
    if (
      sale.payment_status !== "PAID" ||
      sale.sale_status === "CANCELLED" ||
      sale.sale_status === "COMPLETED"
    ) {
      return false;
    }

    return (sale.items || []).some(
      (item) => getOutstandingQuantity(item) > 0
    );
  });

  const selectedSale = sales.find(
    (sale) => String(sale.sale_id) === selectedSaleId
  );

  const handleSaleChange = (saleId: string) => {
    setSelectedSaleId(saleId);

    const sale = sales.find(
      (item) => String(item.sale_id) === saleId
    );

    if (!sale) {
      setExternalQuantities({});
      return;
    }

    const initialQuantities: Record<number, string> = {};

    sale.items.forEach((item) => {
      const outstanding = getOutstandingQuantity(item);

      if (outstanding > 0) {
        initialQuantities[item.sale_item_id] = String(outstanding);
      }
    });

    setExternalQuantities(initialQuantities);
  };

  const createInternalDistribution = async (
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

  const createExternalDistribution = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedSale) {
      setError("Select a customer sale.");
      return;
    }

    if (selectedSale.payment_status !== "PAID") {
      setError("Only fully paid sales can be dispatched.");
      return;
    }

    const items = selectedSale.items
      .map((saleItem) => {
        const dispatchedQuantity = Number(
          externalQuantities[saleItem.sale_item_id] || 0
        );

        return {
          sale_item: saleItem.sale_item_id,
          product: saleItem.product,
          quantity_dispatched: dispatchedQuantity,
          outstanding: getOutstandingQuantity(saleItem),
        };
      })
      .filter((item) => item.quantity_dispatched > 0);

    if (items.length === 0) {
      setError("Enter at least one product quantity to deliver.");
      return;
    }

    for (const item of items) {
      if (
        !Number.isInteger(item.quantity_dispatched) ||
        item.quantity_dispatched < 1
      ) {
        setError("Delivery quantities must be whole numbers greater than zero.");
        return;
      }

      if (item.quantity_dispatched > item.outstanding) {
        setError(
          "A delivery quantity cannot exceed the outstanding order quantity."
        );
        return;
      }
    }

    setSubmitting(true);

    try {
      await api.post("distributions/", {
        distribution_type: "EXTERNAL",
        destination: null,
        sale: selectedSale.sale_id,
        distribution_date: new Date().toISOString(),
        vehicle_number: externalVehicle.trim(),
        driver_name: externalDriver.trim(),
        notes: externalNotes.trim(),
        items: items.map((item) => ({
          sale_item: item.sale_item,
          product: item.product,
          quantity_dispatched: item.quantity_dispatched,
        })),
      });

      setSuccess(
        `External delivery for Sale #${selectedSale.sale_id} created successfully.`
      );

      setSelectedSaleId("");
      setExternalQuantities({});
      setExternalVehicle("");
      setExternalDriver("");
      setExternalNotes("");

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

  const totalExternal = distributions.filter(
    (item) => item.distribution_type === "EXTERNAL"
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
            Manage internal airline deliveries and external customer orders.
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
        {[
          ["Total Distributions", distributions.length],
          ["Internal Distributions", totalInternal],
          ["External Deliveries", totalExternal],
          ["Delivered", delivered],
        ].map(([label, value]) => (
          <div className="col-12 col-md-6 col-xl-3" key={String(label)}>
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body p-4">
                <div className="text-secondary small">
                  {label}
                </div>
                <h3 className="fw-bold mb-0">
                  {Number(value).toLocaleString("en-KE")}
                </h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      {canManage && (
        <>
          {/* Internal distribution */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-1">
                <Plus size={18} className="me-2" />
                Create Internal Distribution
              </h5>

              <p className="text-secondary small mb-4">
                Deliver finished bottled water to internal airline destinations.
              </p>

              <form
                onSubmit={createInternalDistribution}
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
                    <option value="">Select destination</option>

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
                    <option value="">Select product</option>

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
                    Create Internal Distribution
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

          {/* External distribution */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-1">
                <Send size={18} className="me-2" />
                Create External Customer Delivery
              </h5>

              <p className="text-secondary small mb-4">
                Select a paid customer sale and prepare its delivery.
                Only fully paid orders with outstanding quantities are available.
              </p>

              <form
                onSubmit={createExternalDistribution}
                className="row g-3"
              >
                <div className="col-12">
                  <label className="form-label">
                    Paid Customer Sale
                  </label>

                  <select
                    className="form-select"
                    value={selectedSaleId}
                    onChange={(event) =>
                      handleSaleChange(event.target.value)
                    }
                    required
                  >
                    <option value="">
                      Select a paid sale
                    </option>

                    {eligibleSales.map((sale) => (
                      <option
                        key={sale.sale_id}
                        value={sale.sale_id}
                      >
                        Sale #{sale.sale_id} — {sale.customer_name}
                        {" — "}
                        {formatAmount(sale.total_amount)}
                      </option>
                    ))}
                  </select>

                  {eligibleSales.length === 0 && (
                    <div className="form-text text-warning">
                      No paid sales with outstanding quantities are available.
                    </div>
                  )}
                </div>

                {selectedSale && (
                  <>
                    <div className="col-12">
                      <div className="bg-light rounded p-3">
                        <div className="row g-3">
                          <div className="col-12 col-md-4">
                            <div className="small text-secondary">
                              Customer
                            </div>
                            <div className="fw-semibold">
                              {selectedSale.customer_name}
                            </div>
                          </div>

                          <div className="col-12 col-md-4">
                            <div className="small text-secondary">
                              Phone
                            </div>
                            <div className="fw-semibold">
                              {selectedSale.customer_phone}
                            </div>
                          </div>

                          <div className="col-12 col-md-4">
                            <div className="small text-secondary">
                              Sale Amount
                            </div>
                            <div className="fw-semibold">
                              {formatAmount(selectedSale.total_amount)}
                            </div>
                          </div>

                          <div className="col-12 col-md-6">
                            <div className="small text-secondary">
                              Delivery Address
                            </div>
                            <div className="fw-semibold">
                              {selectedSale.delivery_address}
                            </div>
                          </div>

                          <div className="col-12 col-md-3">
                            <div className="small text-secondary">
                              Payment
                            </div>
                            <span className="badge bg-success">
                              {selectedSale.payment_status}
                            </span>
                          </div>

                          <div className="col-12 col-md-3">
                            <div className="small text-secondary">
                              Sale Status
                            </div>
                            <span className="badge bg-primary">
                              {selectedSale.sale_status.replaceAll("_", " ")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-12">
                      <h6 className="fw-semibold mb-2">
                        Products to Deliver
                      </h6>

                      <div className="table-responsive">
                        <table className="table table-bordered align-middle">
                          <thead className="table-light">
                            <tr>
                              <th>Product</th>
                              <th>Ordered</th>
                              <th>Outstanding</th>
                              <th>Quantity to Dispatch</th>
                            </tr>
                          </thead>

                          <tbody>
                            {selectedSale.items.map((item) => {
                              const outstanding =
                                getOutstandingQuantity(item);

                              return (
                                <tr key={item.sale_item_id}>
                                  <td>{item.product_name}</td>

                                  <td>
                                    {item.quantity.toLocaleString("en-KE")}
                                  </td>

                                  <td>
                                    {outstanding.toLocaleString("en-KE")}
                                  </td>

                                  <td>
                                    {outstanding > 0 ? (
                                      <input
                                        type="number"
                                        className="form-control"
                                        min="0"
                                        max={outstanding}
                                        step="1"
                                        value={
                                          externalQuantities[
                                            item.sale_item_id
                                          ] ?? "0"
                                        }
                                        onChange={(event) =>
                                          setExternalQuantities((previous) => ({
                                            ...previous,
                                            [item.sale_item_id]:
                                              event.target.value,
                                          }))
                                        }
                                      />
                                    ) : (
                                      <span className="text-success small">
                                        Fully allocated
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <p className="small text-secondary mb-0">
                        You can dispatch the full outstanding quantity or
                        deliver part of the order. The remaining quantity
                        can be delivered later.
                      </p>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">
                        Vehicle Number
                      </label>

                      <input
                        type="text"
                        className="form-control"
                        value={externalVehicle}
                        onChange={(event) =>
                          setExternalVehicle(event.target.value)
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
                        value={externalDriver}
                        onChange={(event) =>
                          setExternalDriver(event.target.value)
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
                        value={externalNotes}
                        onChange={(event) =>
                          setExternalNotes(event.target.value)
                        }
                        placeholder="Optional delivery notes"
                      />
                    </div>

                    <div className="col-12">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={submitting}
                      >
                        <Plus size={16} className="me-2" />
                        Create External Delivery
                      </button>
                    </div>
                  </>
                )}
              </form>
            </div>
          </div>
        </>
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
                  <th>Destination / Customer</th>
                  <th>Items</th>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Date</th>
                  <th>Status</th>
                  {canManage && <th>Actions</th>}
                </tr>
              </thead>

              <tbody>
                {distributions.map((item) => {
                  const linkedSale = sales.find(
                    (sale) => sale.sale_id === item.sale
                  );

                  return (
                    <tr key={item.distribution_id}>
                      <td className="fw-semibold">
                        #{item.distribution_id}
                      </td>

                      <td>
                        {item.distribution_type}
                      </td>

                      <td>
                        {item.distribution_type === "EXTERNAL"
                          ? linkedSale
                            ? `${linkedSale.customer_name} (Sale #${item.sale})`
                            : `Sale #${item.sale ?? "—"}`
                          : item.destination_name || "—"}
                      </td>

                      <td>
                        {item.items?.length ? (
                          item.items.map((entry, index) => (
                            <div key={`${entry.product}-${index}`}>
                              {entry.product_name ||
                                `Product ${entry.product}`}
                              {" × "}
                              {Number(
                                entry.quantity_dispatched
                              ).toLocaleString("en-KE")}
                            </div>
                          ))
                        ) : (
                          "—"
                        )}
                      </td>

                      <td>{item.vehicle_number || "—"}</td>
                      <td>{item.driver_name || "—"}</td>
                      <td>{formatDate(item.distribution_date)}</td>

                      <td>
                        <span
                          className={`badge ${statusClass(item.status)}`}
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
                                <Send size={14} className="me-1" />
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
                  );
                })}

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