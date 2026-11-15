import Products from "./pages/Products";
import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";

import {
  LayoutDashboard,
  Package,
  Factory,
  Boxes,
  ShoppingCart,
  Truck,
  BrainCircuit,
  Users,
  LogOut,
  Menu,
  Droplets,
} from "lucide-react";

import api from "./services/api";
import "./App.css";

// Dashboard response structure
type DashboardData = {
  total_products: number;
  total_stock: number;
  total_batches: number;
  total_produced: number;
  total_sales: number;
  total_revenue: number;
  pending_sales: number;
  completed_deliveries: number;
  low_stock_products: Array<{
    product_name?: string;
    quantity_available?: number;
    reorder_level?: number;
  }>;
};

// LOGIN PAGE
function Login({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await api.post("token/", {
        username,
        password,
      });

      localStorage.setItem("access_token", response.data.access);
      localStorage.setItem("refresh_token", response.data.refresh);

      onLogin();
      navigate("/");
    } catch {
      setError("Login failed. Check your username and password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand-icon">
          <Droplets size={30} />
        </div>

        <h2>KQuench</h2>

        <p className="text-muted">
          Water Production Management System
        </p>

        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

// SIDEBAR
function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const links = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/products", label: "Products", icon: Package },
    { to: "/production", label: "Production", icon: Factory },
    { to: "/inventory", label: "Inventory", icon: Boxes },
    { to: "/sales", label: "Sales", icon: ShoppingCart },
    { to: "/distribution", label: "Distribution", icon: Truck },
    { to: "/predictions", label: "Predictions", icon: BrainCircuit },
    { to: "/users", label: "User Management", icon: Users },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Droplets size={27} />
        <span>KQuench</span>
      </div>

      <div className="sidebar-section">MAIN MENU</div>

      <nav>
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
            onClick={onNavigate}
          >
            <Icon size={19} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="logout-button"
          onClick={() => {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
            window.location.href = "/login";
          }}
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

// DASHBOARD
function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("dashboard/")
      .then((response) => {
        setData(response.data);
      })
      .catch(() => {
        setError("Unable to load dashboard data. Please try again.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const stats = [
    {
      label: "Total Products",
      value: data?.total_products ?? 0,
      icon: Package,
      color: "blue",
    },
    {
      label: "Available Stock",
      value: data?.total_stock ?? 0,
      icon: Boxes,
      color: "green",
    },
    {
      label: "Production Batches",
      value: data?.total_batches ?? 0,
      icon: Factory,
      color: "orange",
    },
    {
      label: "Total Sales",
      value: data?.total_sales ?? 0,
      icon: ShoppingCart,
      color: "purple",
    },
  ];

  if (loading) {
    return <p>Loading dashboard...</p>;
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Dashboard</h2>
          <p>Overview of your water production and operations.</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-warning">
          {error}
        </div>
      )}

      <div className="row g-3 mb-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              className="col-12 col-sm-6 col-xl-3"
              key={stat.label}
            >
              <div className="stat-card">
                <div className={`stat-icon ${stat.color}`}>
                  <Icon size={22} />
                </div>

                <p>{stat.label}</p>

                <h3>{stat.value.toLocaleString()}</h3>
              </div>
            </div>
          );
        })}
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-7">
          <div className="content-card">
            <h5>Operations Summary</h5>

            <div className="summary-row">
              <span>Total Produced</span>
              <strong>{data?.total_produced ?? 0}</strong>
            </div>

            <div className="summary-row">
              <span>Pending Sales</span>
              <strong>{data?.pending_sales ?? 0}</strong>
            </div>

            <div className="summary-row">
              <span>Completed Deliveries</span>
              <strong>{data?.completed_deliveries ?? 0}</strong>
            </div>

            <div className="summary-row">
              <span>Total Revenue</span>
              <strong>
                KES {(data?.total_revenue ?? 0).toLocaleString()}
              </strong>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-5">
          <div className="content-card">
            <h5>Low Stock Products</h5>

            {data?.low_stock_products?.length ? (
              data.low_stock_products.map((product, index) => (
                <div className="summary-row" key={index}>
                  <span>
                    {product.product_name ?? "Product"}
                  </span>

                  <strong className="text-danger">
                    {product.quantity_available ?? 0}
                  </strong>
                </div>
              ))
            ) : (
              <p className="text-muted mb-0">
                No low-stock products reported.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// PLACEHOLDER FOR MODULES UNDER DEVELOPMENT
function Placeholder({ title }: { title: string }) {
  return (
    <div className="page-heading">
      <div>
        <h2>{title}</h2>
        <p>
          This module will be connected to the Django API next.
        </p>
      </div>
    </div>
  );
}

// MAIN APPLICATION LAYOUT
function MainLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-layout">
      <div
        className={`sidebar-overlay ${menuOpen ? "show" : ""}`}
        onClick={() => setMenuOpen(false)}
      />

      <div className={`sidebar-wrapper ${menuOpen ? "open" : ""}`}>
        <Sidebar onNavigate={() => setMenuOpen(false)} />
      </div>

      <main className="main-content">
        <header className="topbar">
          <button
            type="button"
            className="mobile-menu"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation"
          >
            <Menu size={22} />
          </button>

          <span className="topbar-title">
            Management Portal
          </span>

          <span className="topbar-user">
            Administrator
          </span>
        </header>

        <div className="page-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />

            <Route
              path="/products"
              element={<Products />}
            />

            <Route
              path="/production"
              element={<Placeholder title="Production" />}
            />

            <Route
              path="/inventory"
              element={<Placeholder title="Inventory" />}
            />

            <Route
              path="/sales"
              element={<Placeholder title="Sales" />}
            />

            <Route
              path="/distribution"
              element={<Placeholder title="Distribution" />}
            />

            <Route
              path="/predictions"
              element={<Placeholder title="Predictive Analysis" />}
            />

            <Route
              path="/users"
              element={<Placeholder title="User Management" />}
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

// ROOT APPLICATION
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(localStorage.getItem("access_token"))
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <Login onLogin={() => setIsAuthenticated(true)} />
            )
          }
        />

        <Route
          path="/*"
          element={
            isAuthenticated ? (
              <MainLayout />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
