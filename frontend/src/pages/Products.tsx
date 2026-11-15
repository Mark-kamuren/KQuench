
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Power,
  RefreshCw,
  Package,
  X,
} from "lucide-react";
import api from "../services/api";

type Product = {
  product_id: number;
  product_name: string;
  description: string | null;
  unit_size_ml: number;
  unit_price: string | number;
  is_active: boolean;
  created_at: string;
};

type ProductForm = {
  product_name: string;
  description: string;
  unit_size_ml: string;
  unit_price: string;
};

const emptyForm: ProductForm = {
  product_name: "",
  description: "",
  unit_size_ml: "",
  unit_price: "",
};

function getErrorMessage(error: any): string {
  const data = error?.response?.data;

  if (typeof data === "string") return data;
  if (data?.detail) return data.detail;

  if (data && typeof data === "object") {
    return Object.entries(data)
      .map(([field, messages]) => {
        const value = Array.isArray(messages)
          ? messages.join(", ")
          : String(messages);

        return `${field}: ${value}`;
      })
      .join(" | ");
  }

  return "Something went wrong. Please try again.";
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);

  async function loadProducts() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("products/");

      // Supports both ordinary DRF lists and paginated DRF responses.
      const results = Array.isArray(response.data)
        ? response.data
        : response.data.results;

      setProducts(results ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.product_name.toLowerCase().includes(search.toLowerCase()) ||
        String(product.product_id).includes(search);

      const matchesStatus =
        filter === "ALL" ||
        (filter === "ACTIVE" && product.is_active) ||
        (filter === "INACTIVE" && !product.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [products, search, filter]);

  function openCreateForm() {
    setEditingProduct(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(product: Product) {
    setEditingProduct(product);
    setForm({
      product_name: product.product_name,
      description: product.description ?? "",
      unit_size_ml: String(product.unit_size_ml),
      unit_price: String(product.unit_price),
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingProduct(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      product_name: form.product_name.trim(),
      description: form.description.trim() || null,
      unit_size_ml: Number(form.unit_size_ml),
      unit_price: Number(form.unit_price),
    };

    try {
      if (editingProduct) {
        await api.patch(`products/${editingProduct.product_id}/`, payload);
        setSuccess("Product updated successfully.");
      } else {
        await api.post("products/", payload);
        setSuccess("Product created successfully.");
      }

      closeForm();
      await loadProducts();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleProductStatus(product: Product) {
    const action = product.is_active ? "deactivate" : "activate";

    if (
      !window.confirm(
        `Are you sure you want to ${action} ${product.product_name}?`
      )
    ) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await api.patch(`products/${product.product_id}/`, {
        is_active: !product.is_active,
      });

      setSuccess(
        `${product.product_name} has been ${action}d successfully.`
      );

      await loadProducts();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const activeCount = products.filter((p) => p.is_active).length;
  const inactiveCount = products.length - activeCount;

  return (
    <>
      <div className="page-heading d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div>
          <h2>Products</h2>
          <p>Manage bottled water products and their details.</p>
        </div>

        <button
          type="button"
          className="btn btn-primary d-flex align-items-center gap-2"
          onClick={openCreateForm}
        >
          <Plus size={18} />
          Add Product
        </button>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible">
          {error}
          <button
            type="button"
            className="btn-close"
            onClick={() => setError("")}
            aria-label="Close"
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
            aria-label="Close"
          />
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <div className="stat-card">
            <div className="stat-icon blue">
              <Package size={22} />
            </div>
            <p>Total Products</p>
            <h3>{products.length}</h3>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="stat-card">
            <div className="stat-icon green">
              <Package size={22} />
            </div>
            <p>Active Products</p>
            <h3>{activeCount}</h3>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="stat-card">
            <div className="stat-icon orange">
              <Package size={22} />
            </div>
            <p>Inactive Products</p>
            <h3>{inactiveCount}</h3>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="content-card mb-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5 className="mb-0">
              {editingProduct ? "Edit Product" : "Add New Product"}
            </h5>

            <button
              type="button"
              className="btn btn-light btn-sm"
              onClick={closeForm}
              aria-label="Close form"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label">Product Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.product_name}
                  onChange={(e) =>
                    setForm({ ...form, product_name: e.target.value })
                  }
                  placeholder="e.g. Bottled Water 500ml"
                  maxLength={100}
                  required
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Bottle Size (ml)</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.unit_size_ml}
                  onChange={(e) =>
                    setForm({ ...form, unit_size_ml: e.target.value })
                  }
                  min="1"
                  step="1"
                  placeholder="e.g. 500"
                  required
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Unit Price (KES)</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.unit_price}
                  onChange={(e) =>
                    setForm({ ...form, unit_price: e.target.value })
                  }
                  min="0"
                  step="0.01"
                  placeholder="e.g. 50.00"
                  required
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  maxLength={255}
                  placeholder="Optional product description"
                />
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-4">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={closeForm}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingProduct
                    ? "Update Product"
                    : "Save Product"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="content-card">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div>
            <h5 className="mb-1">Product Catalogue</h5>
            <small className="text-muted">
              {filteredProducts.length} product(s) displayed
            </small>
          </div>

          <button
            type="button"
            className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2"
            onClick={loadProducts}
            disabled={loading}
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        <div className="row g-2 mb-4">
          <div className="col-12 col-md-7">
            <div className="input-group">
              <span className="input-group-text">
                <Search size={17} />
              </span>
              <input
                type="search"
                className="form-control"
                placeholder="Search by product name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="col-12 col-md-5">
            <select
              className="form-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="ALL">All Products</option>
              <option value="ACTIVE">Active Products</option>
              <option value="INACTIVE">Inactive Products</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" />
            <p className="text-muted mt-2 mb-0">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-5">
            <Package size={36} className="text-muted mb-2" />
            <h6>No products found</h6>
            <p className="text-muted mb-0">
              Try changing your search or add a new product.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Product ID</th>
                  <th>Product Name</th>
                  <th>Bottle Size</th>
                  <th>Unit Price</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.product_id}>
                    <td>#{product.product_id}</td>

                    <td>
                      <strong>{product.product_name}</strong>
                      {product.description && (
                        <div className="small text-muted">
                          {product.description}
                        </div>
                      )}
                    </td>

                    <td>{product.unit_size_ml.toLocaleString()} ml</td>

                    <td>
                      KES{" "}
                      {Number(product.unit_price).toLocaleString("en-KE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          product.is_active
                            ? "text-bg-success"
                            : "text-bg-secondary"
                        }`}
                      >
                        {product.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td>
                      {new Date(product.created_at).toLocaleDateString()}
                    </td>

                    <td>
                      <div className="d-flex justify-content-end gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          title="Edit product"
                          onClick={() => openEditForm(product)}
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          type="button"
                          className={`btn btn-sm ${
                            product.is_active
                              ? "btn-outline-danger"
                              : "btn-outline-success"
                          }`}
                          title={
                            product.is_active
                              ? "Deactivate product"
                              : "Activate product"
                          }
                          onClick={() => toggleProductStatus(product)}
                        >
                          <Power size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
