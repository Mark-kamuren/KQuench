
import { useEffect, useState } from "react";
import {
  Droplets,
  Package,
  Warehouse,
  ShoppingCart,
  Truck,
  Banknote,
  Factory,
  ClipboardList,
  RefreshCw,
} from "lucide-react";

import api from "../services/api";

interface DashboardData {
  total_products: number;
  total_stock: number;
  total_supplier_receipts: number;
  total_units_received: number;
  total_water_received_litres: number;
  total_water_used_litres: number;
  total_water_loss_litres: number;
  total_bottles_produced: number;
  total_sales: number;
  total_revenue: number;
  pending_sales: number;
  total_internal_distributions: number;
  total_internal_units_distributed: number;
  total_external_deliveries: number;
  completed_internal_deliveries: number;
  completed_external_deliveries: number;
}

const initialData: DashboardData = {
  total_products: 0,
  total_stock: 0,
  total_supplier_receipts: 0,
  total_units_received: 0,
  total_water_received_litres: 0,
  total_water_used_litres: 0,
  total_water_loss_litres: 0,
  total_bottles_produced: 0,
  total_sales: 0,
  total_revenue: 0,
  pending_sales: 0,
  total_internal_distributions: 0,
  total_internal_units_distributed: 0,
  total_external_deliveries: 0,
  completed_internal_deliveries: 0,
  completed_external_deliveries: 0,
};

function formatNumber(value: number | undefined): string {
  return Number(value || 0).toLocaleString("en-KE");
}

function formatCurrency(value: number | undefined): string {
  return `KSh ${Number(value || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="col-12 col-sm-6 col-xl-3">
      <div className="card border-0 shadow-sm h-100">
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <p className="text-secondary small mb-2">{title}</p>
              <h3 className="fw-bold mb-2">{value}</h3>
              <p className="text-secondary small mb-0">{description}</p>
            </div>
            <div className="rounded-3 bg-primary bg-opacity-10 text-primary p-3">
              {icon}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("dashboard/");
      setData({
        ...initialData,
        ...response.data,
      });
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Unable to load dashboard information."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" />
        <p className="text-secondary mt-3">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <div className="d-flex justify-content-between align-items-center">
          <span>{error}</span>
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={loadDashboard}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Dashboard</h2>
          <p className="text-secondary mb-0">
            Overview of KQuench water operations.
          </p>
        </div>

        <button
          className="btn btn-outline-primary btn-sm"
          onClick={loadDashboard}
        >
          <RefreshCw size={15} className="me-2" />
          Refresh
        </button>
      </div>

      <h6 className="text-secondary fw-bold mb-3">
        INVENTORY AND PRODUCTION
      </h6>

      <div className="row g-3 mb-4">
        <StatCard
          title="Active Products"
          value={formatNumber(data.total_products)}
          description="Registered products"
          icon={<Package size={22} />}
        />

        <StatCard
          title="Available Stock"
          value={formatNumber(data.total_stock)}
          description="Finished bottles available"
          icon={<Warehouse size={22} />}
        />

        <StatCard
          title="Water Received"
          value={`${formatNumber(data.total_water_received_litres)} L`}
          description="Nairobi Water supply"
          icon={<Droplets size={22} />}
        />

        <StatCard
          title="Bottles Produced"
          value={formatNumber(data.total_bottles_produced ?? data.total_units_received)}
          description="Finished bottled products"
          icon={<Factory size={22} />}
        />
      </div>

      <h6 className="text-secondary fw-bold mb-3">
        SALES AND REVENUE
      </h6>

      <div className="row g-3 mb-4">
        <StatCard
          title="Total Sales"
          value={formatNumber(data.total_sales)}
          description="Non-cancelled sales"
          icon={<ShoppingCart size={22} />}
        />

        <StatCard
          title="Revenue"
          value={formatCurrency(data.total_revenue)}
          description="Paid sales"
          icon={<Banknote size={22} />}
        />

        <StatCard
          title="Pending Sales"
          value={formatNumber(data.pending_sales)}
          description="Awaiting completion"
          icon={<ClipboardList size={22} />}
        />

        <StatCard
          title="External Deliveries"
          value={formatNumber(data.total_external_deliveries)}
          description="Non-cancelled external deliveries"
          icon={<Truck size={22} />}
        />
      </div>

      <h6 className="text-secondary fw-bold mb-3">
        WATER USAGE AND DISTRIBUTION
      </h6>

      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <h6 className="fw-bold mb-3">Water Processing</h6>

              <div className="d-flex justify-content-between mb-3">
                <span className="text-secondary">Water received</span>
                <strong>
                  {formatNumber(data.total_water_received_litres)} L
                </strong>
              </div>

              <div className="d-flex justify-content-between mb-3">
                <span className="text-secondary">Water used</span>
                <strong>
                  {formatNumber(data.total_water_used_litres)} L
                </strong>
              </div>

              <div className="d-flex justify-content-between">
                <span className="text-secondary">Processing loss</span>
                <strong>
                  {formatNumber(data.total_water_loss_litres)} L
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <h6 className="fw-bold mb-3">Distribution Overview</h6>

              <div className="d-flex justify-content-between mb-3">
                <span className="text-secondary">
                  Internal distributions
                </span>
                <strong>
                  {formatNumber(data.total_internal_distributions)}
                </strong>
              </div>

              <div className="d-flex justify-content-between mb-3">
                <span className="text-secondary">
                  Internal bottles distributed
                </span>
                <strong>
                  {formatNumber(data.total_internal_units_distributed)}
                </strong>
              </div>

              <div className="d-flex justify-content-between mb-3">
                <span className="text-secondary">
                  Completed internal deliveries
                </span>
                <strong>
                  {formatNumber(data.completed_internal_deliveries)}
                </strong>
              </div>

              <div className="d-flex justify-content-between">
                <span className="text-secondary">
                  Completed external deliveries
                </span>
                <strong>
                  {formatNumber(data.completed_external_deliveries)}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
