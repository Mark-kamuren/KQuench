
import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

interface Product {
  product_id: number;
  product_name: string;
  description: string | null;
  unit_size_ml: number;
  unit_price: number | string;
  is_active: boolean;
  created_at?: string;
}

interface ProductsProps {
  role: string;
}

interface ProductForm {
  product_name: string;
  description: string;
  unit_size_ml: string;
  unit_price: string;
}

const emptyForm: ProductForm = {
  product_name: "",
  description: "",
  unit_size_ml: "",
  unit_price: "",
};

function getErrorMessage(error: any): string {
  const data = error?.response?.data;

  if (!data) return "Something went wrong. Please try again.";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;

  return Object.entries(data)
    .map(([field, messages]) => {
      const message = Array.isArray(messages)
        ? messages.join(", ")
        : String(messages);

      return `${field}: ${message}`;
    })
    .join(" | ");
}

export default function Products({ role }: ProductsProps) {
  const canManageProducts =
    role === "ADMIN" || role === "INVENTORY_MANAGER";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("products/");
      const data = response.data;

      setProducts(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.product_name.toLowerCase().includes(search.toLowerCase()) ||
        String(product.product_id).includes(search);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && product.is_active) ||
        (statusFilter === "INACTIVE" && !product.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [products, search, statusFilter]);

  const activeCount = products.filter((p) => p.is_active).length;
  const inactiveCount = products.length - activeCount;

  const openCreateForm = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const openEditForm = (product: Product) => {
    setEditingProduct(product);
    setForm({
      product_name: product.product_name,
      description: product.description || "",
      unit_size_ml: String(product.unit_size_ml),
      unit_price: String(product.unit_price),
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingProduct(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canManageProducts) return;

    const payload = {
      product_name: form.product_name.trim(),
      description: form.description.trim(),
      unit_size_ml: Number(form.unit_size_ml),
      unit_price: Number(form.unit_price),
    };

    if (
      !payload.product_name ||
      payload.unit_size_ml <= 0 ||
      payload.unit_price < 0 ||
      !Number.isFinite(payload.unit_size_ml) ||
      !Number.isFinite(payload.unit_price)
    ) {
      setError("Enter a valid product name, size and price.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (editingProduct) {
        await api.patch(`products/${editingProduct.product_id}/`, payload);
        setSuccess("Product updated successfully.");
      } else {
        await api.post("products/", payload);
        setSuccess("Product added successfully.");
      }

      closeForm();
      await loadProducts();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleProductStatus = async (product: Product) => {
    if (!canManageProducts) return;

    const action = product.is_active ? "deactivate" : "activate";

    if (!window.confirm(`Are you sure you want to ${action} this product?`)) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await api.patch(`products/${product.product_id}/`, {
        is_active: !product.is_active,
      });

      setSuccess(`Product ${action}d successfully.`);
      await loadProducts();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="container-fluid py-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold mb-1">Products</h3>
          <p className="text-muted mb-0">
            Manage bottled water products and their details.
          </p>
        </div>

        {canManageProducts && (
          <button className="btn btn-primary" onClick={openCreateForm}>
            <i className="bi bi-plus-lg me-2"></i>
            Add Product
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible">
          {error}
          <button
            type="button"
            className="btn-close"
            onClick={() => setError("")}
          ></button>
        </div>
      )}

      {success && (
        <div className="alert alert-success alert-dismissible">
          {success}
          <button
            type="button"
            className="btn-close"
            onClick={() => setSuccess("")}
          ></button>
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <p className="text-muted mb-1">Total Products</p>
              <h3 className="fw-bold mb-0">{products.length}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <p className="text-muted mb-1">Active Products</p>
              <h3 className="fw-bold text-success mb-0">{activeCount}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <p className="text-muted mb-1">Inactive Products</p>
              <h3 className="fw-bold text-secondary mb-0">
                {inactiveCount}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {showForm && canManageProducts && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h5 className="mb-0 fw-semibold">
              {editingProduct ? "Edit Product" : "Add New Product"}
            </h5>
            <button
              className="btn-close"
              type="button"
              onClick={closeForm}
            ></button>
          </div>

          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Product Name</label>
                  <input
                    className="form-control"
                    value={form.product_name}
                    onChange={(e) =>
                      setForm({ ...form, product_name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label">Bottle Size (ml)</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={form.unit_size_ml}
                    onChange={(e) =>
                      setForm({ ...form, unit_size_ml: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label">Unit Price (KES)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-control"
                    value={form.unit_price}
                    onChange={(e) =>
                      setForm({ ...form, unit_price: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="d-flex gap-2 mt-4">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Product"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={closeForm}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="row g-3 mb-3">
            <div className="col-md-8">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  className="form-control"
                  placeholder="Search by product name or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="col-md-3">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Products</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <div className="col-md-1">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={loadProducts}
                title="Refresh"
              >
                <i className="bi bi-arrow-clockwise"></i>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary"></div>
              <p className="text-muted mt-2 mb-0">Loading products...</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Product</th>
                    <th>Bottle Size</th>
                    <th>Unit Price</th>
                    <th>Status</th>
                    {canManageProducts && <th>Actions</th>}
                  </tr>
                </thead>

                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.product_id}>
                      <td>#{product.product_id}</td>
                      <td>
                        <div className="fw-semibold">
                          {product.product_name}
                        </div>
                        <small className="text-muted">
                          {product.description || "No description"}
                        </small>
                      </td>
                      <td>{product.unit_size_ml.toLocaleString()} ml</td>
                      <td>
                        KES {Number(product.unit_price).toLocaleString(
                          "en-KE",
                          { minimumFractionDigits: 2 }
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            product.is_active
                              ? "bg-success-subtle text-success"
                              : "bg-secondary-subtle text-secondary"
                          }`}
                        >
                          {product.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {canManageProducts && (
                        <td>
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => openEditForm(product)}
                              title="Edit product"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>

                            <button
                              className={`btn btn-sm ${
                                product.is_active
                                  ? "btn-outline-danger"
                                  : "btn-outline-success"
                              }`}
                              onClick={() => toggleProductStatus(product)}
                              title={
                                product.is_active ? "Deactivate" : "Activate"
                              }
                            >
                              <i
                                className={`bi ${
                                  product.is_active
                                    ? "bi-x-circle"
                                    : "bi-check-circle"
                                }`}
                              ></i>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}

                  {filteredProducts.length === 0 && (
                    <tr>
                      <td
                        colSpan={canManageProducts ? 6 : 5}
                        className="text-center text-muted py-5"
                      >
                        No products found.
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
