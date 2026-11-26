
import { useEffect, useState, type FormEvent } from "react";
import {
  Warehouse,
  RefreshCw,
  ArrowDownCircle,
  ArrowUpCircle,
  ClipboardList,
} from "lucide-react";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

interface InventoryItem {
  inventory_id: number;
  product: number;
  product_name: string;
  quantity_available: number;
  last_updated: string;
}

interface InventoryTransaction {
  transaction_id: number;
  product: number;
  product_name?: string;
  transaction_type: string;
  quantity: number;
  transaction_date: string;
  notes?: string;
}

function extractList<T>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function errorMessage(error: any): string {
  const data = error?.response?.data;

  if (data?.detail) return data.detail;
  if (data?.error) return data.error;

  if (data && typeof data === "object") {
    const firstValue = Object.values(data)[0];

    if (Array.isArray(firstValue)) {
      return String(firstValue[0]);
    }

    if (firstValue) return String(firstValue);
  }

  return "The operation could not be completed.";
}

function transactionLabel(type: string): string {
  const labels: Record<string, string> = {
    WATER_RECEIPT: "Water Receipt",
    BOTTLING: "Bottling",
    PRODUCTION: "Production",
    DISTRIBUTION: "Distribution",
    SALE: "Sale",
    ADJUSTMENT_IN: "Stock Adjustment In",
    ADJUSTMENT_OUT: "Stock Adjustment Out",
  };

  return labels[type] || type.replaceAll("_", " ");
}

export default function Inventory() {
  const { user } = useAuth();

  const canAdjust = [
    "ADMIN",
    "INVENTORY_MANAGER",
  ].includes(user?.role || "");

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<
    InventoryTransaction[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedInventory, setSelectedInventory] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<
    "ADJUSTMENT_IN" | "ADJUSTMENT_OUT"
  >("ADJUSTMENT_IN");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<
    "stock" | "transactions"
  >("stock");

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [inventoryResponse, transactionResponse] =
        await Promise.all([
          api.get("inventory/"),
          api.get("inventory/transactions/"),
        ]);

      setInventory(extractList<InventoryItem>(inventoryResponse.data));
      setTransactions(
        extractList<InventoryTransaction>(transactionResponse.data)
      );
    } catch (err: any) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdjustment = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedInventory) {
      setError("Select a product first.");
      return;
    }

    if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
      setError("Enter a whole number greater than zero.");
      return;
    }

    setSubmitting(true);

    try {
      await api.post(
        `inventory/${selectedInventory}/adjust/`,
        {
          adjustment_type: adjustmentType,
          quantity: Number(quantity),
          notes,
        }
      );

      setSuccess("Inventory adjustment recorded successfully.");
      setQuantity("");
      setNotes("");
      await loadData();
    } catch (err: any) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const totalStock = inventory.reduce(
    (sum, item) => sum + Number(item.quantity_available || 0),
    0
  );

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" />
        <p className="text-secondary mt-3">
          Loading inventory...
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Inventory Management</h2>
          <p className="text-secondary mb-0">
            Monitor finished bottled water stock and stock movements.
          </p>
        </div>

        <button
          className="btn btn-outline-primary btn-sm"
          onClick={loadData}
        >
          <RefreshCw size={15} className="me-2" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible">
          {error}
          <button
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
            className="btn-close"
            onClick={() => setSuccess("")}
            aria-label="Dismiss"
          />
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-12 col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4 d-flex align-items-center gap-3">
              <div className="rounded-3 p-3 bg-primary bg-opacity-10 text-primary">
                <Warehouse size={25} />
              </div>
              <div>
                <div className="text-secondary small">
                  Total Finished Stock
                </div>
                <h4 className="fw-bold mb-0">
                  {totalStock.toLocaleString("en-KE")}
                </h4>
                <small className="text-secondary">
                  Bottles available
                </small>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4 d-flex align-items-center gap-3">
              <div className="rounded-3 p-3 bg-success bg-opacity-10 text-success">
                <ClipboardList size={25} />
              </div>
              <div>
                <div className="text-secondary small">
                  Stock Transactions
                </div>
                <h4 className="fw-bold mb-0">
                  {transactions.length.toLocaleString("en-KE")}
                </h4>
                <small className="text-secondary">
                  Recorded movements
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white p-3">
          <ul className="nav nav-pills gap-2">
            <li className="nav-item">
              <button
                className={`nav-link ${
                  activeTab === "stock" ? "active" : ""
                }`}
                onClick={() => setActiveTab("stock")}
              >
                Available Stock
              </button>
            </li>

            <li className="nav-item">
              <button
                className={`nav-link ${
                  activeTab === "transactions" ? "active" : ""
                }`}
                onClick={() => setActiveTab("transactions")}
              >
                Stock Transactions
              </button>
            </li>
          </ul>
        </div>

        <div className="card-body p-3 p-md-4">
          {activeTab === "stock" && (
            <>
              <h5 className="fw-bold mb-3">Finished Product Stock</h5>

              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Product</th>
                      <th>Available Quantity</th>
                      <th>Last Updated</th>
                    </tr>
                  </thead>

                  <tbody>
                    {inventory.map((item) => (
                      <tr key={item.inventory_id}>
                        <td className="fw-semibold">
                          {item.product_name}
                        </td>
                        <td>
                          {Number(
                            item.quantity_available || 0
                          ).toLocaleString("en-KE")}
                        </td>
                        <td>
                          {item.last_updated
                            ? new Date(item.last_updated).toLocaleString()
                            : "—"}
                        </td>
                      </tr>
                    ))}

                    {inventory.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="text-center text-secondary py-4"
                        >
                          No inventory records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {canAdjust && (
                <div className="border-top pt-4 mt-4">
                  <h5 className="fw-bold mb-3">
                    Manual Stock Adjustment
                  </h5>

                  <p className="text-secondary small">
                    Use adjustments only to correct recorded stock.
                    Normal stock increases should come from bottling,
                    and normal reductions should come from sales or
                    distribution.
                  </p>

                  <form
                    onSubmit={handleAdjustment}
                    className="row g-3"
                  >
                    <div className="col-12 col-md-4">
                      <label className="form-label">
                        Product
                      </label>
                      <select
                        className="form-select"
                        value={selectedInventory}
                        onChange={(event) =>
                          setSelectedInventory(event.target.value)
                        }
                        required
                      >
                        <option value="">Select product</option>
                        {inventory.map((item) => (
                          <option
                            key={item.inventory_id}
                            value={item.inventory_id}
                          >
                            {item.product_name} —{" "}
                            {Number(item.quantity_available).toLocaleString("en-KE")}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-md-3">
                      <label className="form-label">
                        Adjustment Type
                      </label>
                      <select
                        className="form-select"
                        value={adjustmentType}
                        onChange={(event) =>
                          setAdjustmentType(
                            event.target.value as
                              | "ADJUSTMENT_IN"
                              | "ADJUSTMENT_OUT"
                          )
                        }
                      >
                        <option value="ADJUSTMENT_IN">
                          Increase Stock
                        </option>
                        <option value="ADJUSTMENT_OUT">
                          Reduce Stock
                        </option>
                      </select>
                    </div>

                    <div className="col-12 col-md-2">
                      <label className="form-label">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        className="form-control"
                        value={quantity}
                        onChange={(event) =>
                          setQuantity(event.target.value)
                        }
                        required
                      />
                    </div>

                    <div className="col-12 col-md-3">
                      <label className="form-label">
                        Reason / Notes
                      </label>
                      <input
                        className="form-control"
                        value={notes}
                        onChange={(event) =>
                          setNotes(event.target.value)
                        }
                        placeholder="Reason for adjustment"
                      />
                    </div>

                    <div className="col-12">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={submitting}
                      >
                        {adjustmentType === "ADJUSTMENT_IN" ? (
                          <ArrowUpCircle size={16} className="me-2" />
                        ) : (
                          <ArrowDownCircle size={16} className="me-2" />
                        )}
                        {submitting
                          ? "Saving..."
                          : "Save Adjustment"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}

          {activeTab === "transactions" && (
            <>
              <h5 className="fw-bold mb-3">Inventory Transactions</h5>

              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Transaction</th>
                      <th>Product</th>
                      <th>Type</th>
                      <th>Quantity</th>
                      <th>Date</th>
                      <th>Notes</th>
                    </tr>
                  </thead>

                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction.transaction_id}>
                        <td>#{transaction.transaction_id}</td>
                        <td>
                          {transaction.product_name ||
                            transaction.product}
                        </td>
                        <td>
                          <span className="badge bg-light text-dark">
                            {transactionLabel(
                              transaction.transaction_type
                            )}
                          </span>
                        </td>
                        <td>
                          {Number(transaction.quantity).toLocaleString("en-KE")}
                        </td>
                        <td>
                          {transaction.transaction_date
                            ? new Date(
                                transaction.transaction_date
                              ).toLocaleString()
                            : "—"}
                        </td>
                        <td>{transaction.notes || "—"}</td>
                      </tr>
                    ))}

                    {transactions.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="text-center text-secondary py-4"
                        >
                          No inventory transactions found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
