
import { useEffect, useState } from "react";
import api from "../services/api";

interface InventoryItem {
  inventory_id: number;
  product: number;
  product_name: string;
  quantity_available: number;
  reorder_level: number;
  last_updated: string;
}

interface Transaction {
  transaction_id: number;
  product_name?: string;
  transaction_type: string;
  quantity: number;
  notes?: string;
  transaction_date?: string;
  created_at?: string;
}

function errorMessage(error: any) {
  const data = error?.response?.data;
  if (data?.detail) return data.detail;
  if (!data) return "An unexpected error occurred.";

  return Object.entries(data)
    .map(([key, value]) =>
      `${key}: ${Array.isArray(value) ? value.join(", ") : value}`
    )
    .join(" | ");
}

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [adjustmentType, setAdjustmentType] = useState("ADJUSTMENT_IN");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [inventoryResponse, transactionResponse] = await Promise.all([
        api.get("inventory/"),
        api.get("inventory/transactions/"),
      ]);

      const inventoryData = inventoryResponse.data;
      const transactionData = transactionResponse.data;

      setItems(
        Array.isArray(inventoryData)
          ? inventoryData
          : inventoryData.results || []
      );

      setTransactions(
        Array.isArray(transactionData)
          ? transactionData
          : transactionData.results || []
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const totalStock = items.reduce(
    (sum, item) => sum + Number(item.quantity_available),
    0
  );

  const lowStock = items.filter(
    (item) => item.quantity_available <= item.reorder_level
  );

  async function handleAdjustment(e: React.FormEvent) {
    e.preventDefault();

    if (!selected) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await api.post(
        `inventory/${selected.inventory_id}/adjust/`,
        {
          adjustment_type: adjustmentType,
          quantity: Number(quantity),
          notes,
        }
      );

      setSuccess("Inventory adjustment recorded successfully.");
      setSelected(null);
      setQuantity("");
      setNotes("");

      await loadData();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container-fluid py-3">
      <div className="mb-4">
        <h3 className="fw-bold">Inventory Management</h3>
        <p className="text-muted">
          Monitor available bottled water stock and inventory movements.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <p className="text-muted mb-1">Total Stock</p>
              <h3 className="fw-bold">{totalStock.toLocaleString()}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <p className="text-muted mb-1">Products Tracked</p>
              <h3 className="fw-bold">{items.length}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <p className="text-muted mb-1">Low Stock Products</p>
              <h3 className="fw-bold text-danger">{lowStock.length}</h3>
            </div>
          </div>
        </div>
      </div>

      {selected && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white py-3 d-flex justify-content-between">
            <h5 className="mb-0">Adjust Inventory: {selected.product_name}</h5>
            <button
              className="btn-close"
              onClick={() => setSelected(null)}
            />
          </div>

          <div className="card-body">
            <form onSubmit={handleAdjustment}>
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label">Adjustment Type</label>
                  <select
                    className="form-select"
                    value={adjustmentType}
                    onChange={(e) => setAdjustmentType(e.target.value)}
                  >
                    <option value="ADJUSTMENT_IN">Stock In</option>
                    <option value="ADJUSTMENT_OUT">Stock Out</option>
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                </div>

                <div className="col-md-4">
                  <label className="form-label">Notes</label>
                  <input
                    className="form-control"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                className="btn btn-primary mt-3"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Adjustment"}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white py-3">
          <h5 className="mb-0 fw-semibold">Available Stock</h5>
        </div>

        <div className="card-body">
          {loading ? (
            <p className="text-muted">Loading inventory...</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Product</th>
                    <th>Available Quantity</th>
                    <th>Reorder Level</th>
                    <th>Status</th>
                    <th>Last Updated</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item) => {
                    const isLow =
                      item.quantity_available <= item.reorder_level;

                    return (
                      <tr key={item.inventory_id}>
                        <td className="fw-semibold">{item.product_name}</td>
                        <td>{Number(item.quantity_available).toLocaleString()}</td>
                        <td>{Number(item.reorder_level).toLocaleString()}</td>
                        <td>
                          <span
                            className={`badge ${
                              isLow ? "bg-danger" : "bg-success"
                            }`}
                          >
                            {isLow ? "Low Stock" : "Available"}
                          </span>
                        </td>
                        <td>
                          {item.last_updated
                            ? new Date(item.last_updated).toLocaleDateString()
                            : "-"}
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => setSelected(item)}
                          >
                            Adjust
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        No inventory records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white py-3">
          <h5 className="mb-0 fw-semibold">Inventory Transactions</h5>
        </div>

        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Product</th>
                  <th>Transaction Type</th>
                  <th>Quantity</th>
                  <th>Notes</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction, index) => (
                  <tr key={transaction.transaction_id ?? index}>
                    <td>{transaction.product_name || "-"}</td>
                    <td>{transaction.transaction_type}</td>
                    <td>{Number(transaction.quantity).toLocaleString()}</td>
                    <td>{transaction.notes || "-"}</td>
                    <td>
                      {transaction.transaction_date ||
                        transaction.created_at ||
                        "-"}
                    </td>
                  </tr>
                ))}

                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-4">
                      No inventory transactions found.
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