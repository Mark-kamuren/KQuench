
import { useEffect, useState } from "react";
import api from "../services/api";

interface Product {
  product_id: number;
  product_name: string;
  unit_size_ml: number;
  is_active: boolean;
}

interface Receipt {
  receipt_id: number;
  supplier_name: string;
  delivery_reference: string;
  product: number;
  product_name: string;
  received_date: string;
  quantity_received: number;
  notes: string;
  created_at: string;
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

export default function SupplierReceipts() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    supplier_name: "",
    delivery_reference: "",
    product: "",
    received_date: new Date().toISOString().slice(0, 10),
    quantity_received: "",
    notes: "",
  });

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [receiptResponse, productResponse] = await Promise.all([
        api.get("supplier-receipts/"),
        api.get("products/"),
      ]);

      const receiptData = receiptResponse.data;
      const productData = productResponse.data;

      setReceipts(
        Array.isArray(receiptData)
          ? receiptData
          : receiptData.results || []
      );

      const productList = Array.isArray(productData)
        ? productData
        : productData.results || [];

      setProducts(productList.filter((p: Product) => p.is_active));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await api.post("supplier-receipts/", {
        ...form,
        product: Number(form.product),
        quantity_received: Number(form.quantity_received),
      });

      setSuccess("Supplier receipt recorded successfully.");

      setForm({
        supplier_name: "",
        delivery_reference: "",
        product: "",
        received_date: new Date().toISOString().slice(0, 10),
        quantity_received: "",
        notes: "",
      });

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
        <h3 className="fw-bold">Supplier Receipts</h3>
        <p className="text-muted">
          Record finished bottled water received from external suppliers.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white py-3">
          <h5 className="mb-0 fw-semibold">Record Supplier Receipt</h5>
        </div>

        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Supplier Name</label>
                <input
                  className="form-control"
                  value={form.supplier_name}
                  onChange={(e) =>
                    setForm({ ...form, supplier_name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Delivery Reference</label>
                <input
                  className="form-control"
                  value={form.delivery_reference}
                  onChange={(e) =>
                    setForm({ ...form, delivery_reference: e.target.value })
                  }
                  required
                />
              </div>

              <div className="col-md-4">
                <label className="form-label">Product</label>
                <select
                  className="form-select"
                  value={form.product}
                  onChange={(e) =>
                    setForm({ ...form, product: e.target.value })
                  }
                  required
                >
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option
                      key={product.product_id}
                      value={product.product_id}
                    >
                      {product.product_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-4">
                <label className="form-label">Received Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.received_date}
                  onChange={(e) =>
                    setForm({ ...form, received_date: e.target.value })
                  }
                  required
                />
              </div>

              <div className="col-md-4">
                <label className="form-label">Quantity Received</label>
                <input
                  type="number"
                  min="1"
                  className="form-control"
                  value={form.quantity_received}
                  onChange={(e) =>
                    setForm({ ...form, quantity_received: e.target.value })
                  }
                  required
                />
              </div>

              <div className="col-12">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary mt-4"
              disabled={saving}
            >
              {saving ? "Recording..." : "Record Receipt"}
            </button>
          </form>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white py-3 d-flex justify-content-between">
          <h5 className="mb-0 fw-semibold">Receipt History</h5>
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={loadData}
          >
            <i className="bi bi-arrow-clockwise me-1" />
            Refresh
          </button>
        </div>

        <div className="card-body">
          {loading ? (
            <p className="text-muted">Loading receipts...</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Receipt ID</th>
                    <th>Supplier</th>
                    <th>Reference</th>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Received Date</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((receipt) => (
                    <tr key={receipt.receipt_id}>
                      <td>#{receipt.receipt_id}</td>
                      <td>{receipt.supplier_name}</td>
                      <td>{receipt.delivery_reference}</td>
                      <td>{receipt.product_name}</td>
                      <td>{Number(receipt.quantity_received).toLocaleString()}</td>
                      <td>{receipt.received_date}</td>
                    </tr>
                  ))}

                  {receipts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        No supplier receipts recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}