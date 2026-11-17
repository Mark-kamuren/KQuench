
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

interface DashboardData {
  total_products: number;
  total_stock: number;
  total_supplier_receipts: number;
  total_units_received: number;
  total_sales: number;
  total_revenue: number;
  pending_sales: number;
  total_internal_distributions: number;
  total_internal_units_distributed: number;
  total_external_deliveries: number;
  completed_internal_deliveries: number;
  completed_external_deliveries: number;
  low_stock_products: {
    product_id: number;
    product_name: string;
    quantity_available: number;
    reorder_level: number;
  }[];
}

const initialData: DashboardData = {
  total_products: 0,
  total_stock: 0,
  total_supplier_receipts: 0,
  total_units_received: 0,
  total_sales: 0,
  total_revenue: 0,
  pending_sales: 0,
  total_internal_distributions: 0,
  total_internal_units_distributed: 0,
  total_external_deliveries: 0,
  completed_internal_deliveries: 0,
  completed_external_deliveries: 0,
  low_stock_products: [],
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("dashboard/");
      setData({ ...initialData, ...response.data });
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
        "Unable to load dashboard information."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const formatNumber = (value: number) =>
    Number(value || 0).toLocaleString("en-KE");

  const formatCurrency = (value: number) =>
    `KES ${Number(value || 0).toLocaleString("en-KE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const cards = [
    {
      title: "Total Products",
      value: formatNumber(data.total_products),
      icon: "bi-box-seam",
      color: "primary",
      link: "/products",
    },
    {
      title: "Available Stock",
      value: formatNumber(data.total_stock),
      icon: "bi-boxes",
      color: "success",
      link: "/inventory",
    },
    {
      title: "Supplier Receipts",
      value: formatNumber(data.total_supplier_receipts),
      icon: "bi-truck",
      color: "info",
      link: "/supplier-receipts",
    },
    {
      title: "Units Received",
      value: formatNumber(data.total_units_received),
      icon: "bi-box-arrow-in-down",
      color: "success",
      link: "/supplier-receipts",
    },
    {
      title: "Total Sales",
      value: formatNumber(data.total_sales),
      icon: "bi-cart-check",
      color: "warning",
      link: "/sales",
    },
    {
      title: "Sales Revenue",
      value: formatCurrency(data.total_revenue),
      icon: "bi-currency-exchange",
      color: "primary",
      link: "/sales",
    },
  ];

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" />
        <p className="text-muted mt-2">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Dashboard</h3>
          <p className="text-muted mb-0">
            Overview of KQuench operations.
          </p>
        </div>

        <button
          className="btn btn-outline-primary"
          onClick={loadDashboard}
        >
          <i className="bi bi-arrow-clockwise me-2" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      <div className="row g-3 mb-4">
        {cards.map((card) => (
          <div className="col-sm-6 col-xl-4" key={card.title}>
            <Link
              to={card.link}
              className="text-decoration-none"
            >
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body d-flex justify-content-between align-items-center">
                  <div>
                    <p className="text-muted mb-2">
                      {card.title}
                    </p>
                    <h3 className="fw-bold text-dark mb-0">
                      {card.value}
                    </h3>
                  </div>

                  <div
                    className={`rounded-circle bg-${card.color}-subtle text-${card.color} p-3`}
                  >
                    <i className={`bi ${card.icon} fs-4`} />
                  </div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h6 className="text-muted">Pending Sales</h6>
              <h3 className="fw-bold">{formatNumber(data.pending_sales)}</h3>
              <Link to="/sales" className="small text-decoration-none">
                View sales
              </Link>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h6 className="text-muted">Internal Distributions</h6>
              <h3 className="fw-bold">
                {formatNumber(data.total_internal_distributions)}
              </h3>
              <p className="text-muted small mb-0">
                {formatNumber(data.total_internal_units_distributed)} units distributed
              </p>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h6 className="text-muted">Completed Deliveries</h6>
              <h3 className="fw-bold">
                {formatNumber(
                  data.completed_internal_deliveries +
                  data.completed_external_deliveries
                )}
              </h3>
              <p className="text-muted small mb-0">
                Internal and external deliveries
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white py-3 d-flex justify-content-between">
          <h5 className="fw-semibold mb-0">Low Stock Alerts</h5>
          <Link to="/inventory" className="text-decoration-none">
            View inventory
          </Link>
        </div>

        <div className="card-body">
          {data.low_stock_products.length === 0 ? (
            <p className="text-muted mb-0">
              No low-stock products reported.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Product</th>
                    <th>Available Stock</th>
                    <th>Reorder Level</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.low_stock_products.map((product) => (
                    <tr key={product.product_id}>
                      <td>{product.product_name}</td>
                      <td>{formatNumber(product.quantity_available)}</td>
                      <td>{formatNumber(product.reorder_level)}</td>
                      <td>
                        <span className="badge bg-danger">
                          Low Stock
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
