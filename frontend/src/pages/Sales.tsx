
import { useEffect, useState } from "react";
import api from "../services/api";

interface Product {
  product_id: number;
  product_name: string;
  unit_price: number | string;
  is_active: boolean;
}

interface SaleItem {
  product: number;
  product_name?: string;
  quantity: number;
  unit_price?: number | string;
  subtotal?: number | string;
}

interface Sale {
  sale_id: number;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  sale_date: string;
  total_amount: number | string;
  payment_status: string;
  sale_status: string;
  items: SaleItem[];
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

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    delivery_address: "",
  });

  const [saleItems, setSaleItems] = useState([
    { product: "", quantity: "1" },
  ]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [salesResponse, productsResponse] = await Promise.all([
        api.get("sales/"),
        api.get("products/"),
      ]);

      const salesData = salesResponse.data;
      const productsData = productsResponse.data;

      setSales(
        Array.isArray(salesData)
          ? salesData
          : salesData.results || []
      );

      const productList = Array.isArray(productsData)
        ? productsData
        : productsData.results || [];

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

  function updateItem(
    index: number,
    field: "product" | "quantity",
    value: string
  ) {
    setSaleItems((previous) =>
      previous.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  }

  function addItem() {
    setSaleItems((previous) => [
      ...previous,
      { product: "", quantity: "1" },
    ]);
  }

  function removeItem(index: number) {
    setSaleItems((previous) =>
      previous.length === 1
        ? previous
        : previous.filter((_, i) => i !== index)
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (saleItems.some((item) => !item.product || Number(item.quantity) < 1)) {
      setError("Select a product and enter a valid quantity for every item.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await api.post("sales/", {
        ...form,
        items: saleItems.map((item) => ({
          product: Number(item.product),
          quantity: Number(item.quantity),
        })),
      });

      setSuccess("External sale created successfully.");

      setForm({
        customer_name: "",
        customer_phone: "",
        delivery_address: "",
      });

      setSaleItems([{ product: "", quantity: "1" }]);

      await loadData();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function markAsPaid(sale: Sale) {
    const confirmed = window.confirm(
      `Confirm that payment of ${formatCurrency(sale.total_amount)} has been received from ${sale.customer_name}?`
    );

    if (!confirmed) return;

    try {
      setUpdatingPayment(sale.sale_id);
      setError("");
      setSuccess("");

      await api.patch(`sales/${sale.sale_id}/`, {
        payment_status: "PAID",
      });

      setSuccess(`Sale #${sale.sale_id} has been marked as PAID.`);
      await loadData();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUpdatingPayment(null);
    }
  }

  const formatCurrency = (value: number | string) =>
    `KES ${Number(value || 0).toLocaleString("en-KE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <div className="container-fluid py-3">
      <div className="mb-4">
        <h3 className="fw-bold">Sales Management</h3>
        <p className="text-muted">
          Manage external customers, sales orders, payments and delivery information.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white py-3">
          <h5 className="mb-0 fw-semibold">Create External Sale</h5>
        </div>

        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <label className="form-label">Customer Name</label>
                <input
                  className="form-control"
                  value={form.customer_name}
                  onChange={(e) =>
                    setForm({ ...form, customer_name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="col-md-4">
                <label className="form-label">Customer Phone</label>
                <input
                  className="form-control"
                  value={form.customer_phone}
                  onChange={(e) =>
                    setForm({ ...form, customer_phone: e.target.value })
                  }
                  required
                />
              </div>

              <div className="col-md-4">
                <label className="form-label">Delivery Address</label>
                <input
                  className="form-control"
                  value={form.delivery_address}
                  onChange={(e) =>
                    setForm({ ...form, delivery_address: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <h6 className="fw-semibold mb-3">Sale Items</h6>

            {saleItems.map((item, index) => (
              <div className="row g-2 mb-3" key={index}>
                <div className="col-md-7">
                  <select
                    className="form-select"
                    value={item.product}
                    onChange={(e) =>
                      updateItem(index, "product", e.target.value)
                    }
                    required
                  >
                    <option value="">Select bottled water product</option>
                    {products.map((product) => (
                      <option
                        key={product.product_id}
                        value={product.product_id}
                      >
                        {product.product_name} - {formatCurrency(product.unit_price)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-3">
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    placeholder="Quantity"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, "quantity", e.target.value)
                    }
                    required
                  />
                </div>

                <div className="col-md-2">
                  <button
                    type="button"
                    className="btn btn-outline-danger w-100"
                    onClick={() => removeItem(index)}
                    disabled={saleItems.length === 1}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={addItem}
            >
              <i className="bi bi-plus-lg me-2" />
              Add Another Product
            </button>

            <div className="mt-4">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? "Creating Sale..." : "Create Sale"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white py-3 d-flex justify-content-between">
          <h5 className="mb-0 fw-semibold">Sales History</h5>
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={loadData}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise me-1" />
            Refresh
          </button>
        </div>

        <div className="card-body">
          {loading ? (
            <p className="text-muted">Loading sales...</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Sale ID</th>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Total Amount</th>
                    <th>Payment</th>
                    <th>Sale Status</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.sale_id}>
                      <td>#{sale.sale_id}</td>
                      <td>{sale.customer_name}</td>
                      <td>{sale.customer_phone}</td>
                      <td>{formatCurrency(sale.total_amount)}</td>
                      <td>
                        <span
                          className={`badge ${
                            sale.payment_status === "PAID"
                              ? "bg-success"
                              : sale.payment_status === "CANCELLED"
                              ? "bg-danger"
                              : "bg-warning text-dark"
                          }`}
                        >
                          {sale.payment_status}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            sale.sale_status === "COMPLETED"
                              ? "bg-success"
                              : sale.sale_status === "CANCELLED"
                              ? "bg-danger"
                              : "bg-warning text-dark"
                          }`}
                        >
                          {sale.sale_status}
                        </span>
                      </td>
                      <td>
                        {sale.sale_date
                          ? new Date(sale.sale_date).toLocaleDateString()
                          : "-"}
                      </td>
                      <td>
                        {sale.payment_status === "PENDING" &&
                        sale.sale_status !== "CANCELLED" ? (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => markAsPaid(sale)}
                            disabled={updatingPayment === sale.sale_id}
                          >
                            {updatingPayment === sale.sale_id
                              ? "Updating..."
                              : "Mark as Paid"}
                          </button>
                        ) : sale.payment_status === "PAID" ? (
                          <span className="text-success small fw-semibold">
                            Payment received
                          </span>
                        ) : (
                          <span className="text-muted small">No action</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {sales.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-4">
                        No sales recorded yet.
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