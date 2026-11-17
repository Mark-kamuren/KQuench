
import React, { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";

import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Warehouse,
  ShoppingCart,
  Truck,
  BrainCircuit,
  Users,
  LogOut,
  Menu,
  X,
  UserCircle,
} from "lucide-react";

import { useAuth } from "./context/AuthContext";
import Products from "./pages/Products";
import "./App.css";

type UserRole =
  | "ADMIN"
  | "PRODUCTION_MANAGER"
  | "INVENTORY_MANAGER"
  | "SALES_OFFICER"
  | "DISTRIBUTION_OFFICER";

interface NavigationItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const allRoles: UserRole[] = [
  "ADMIN",
  "PRODUCTION_MANAGER",
  "INVENTORY_MANAGER",
  "SALES_OFFICER",
  "DISTRIBUTION_OFFICER",
];

const navigation: NavigationItem[] = [
  {
    label: "Dashboard",
    path: "/",
    icon: <LayoutDashboard size={19} />,
    roles: ["ADMIN"],
  },
  {
    label: "Products",
    path: "/products",
    icon: <Package size={19} />,
    roles: allRoles,
  },
  {
    label: "Supplier Receipts",
    path: "/supplier-receipts",
    icon: <ClipboardList size={19} />,
    roles: ["ADMIN", "PRODUCTION_MANAGER", "INVENTORY_MANAGER"],
  },
  {
    label: "Inventory",
    path: "/inventory",
    icon: <Warehouse size={19} />,
    roles: allRoles,
  },
  {
    label: "Sales",
    path: "/sales",
    icon: <ShoppingCart size={19} />,
    roles: ["ADMIN", "SALES_OFFICER", "DISTRIBUTION_OFFICER"],
  },
  {
    label: "Distribution",
    path: "/distribution",
    icon: <Truck size={19} />,
    roles: ["ADMIN", "DISTRIBUTION_OFFICER"],
  },
  {
    label: "Predictions",
    path: "/predictions",
    icon: <BrainCircuit size={19} />,
    roles: allRoles,
  },
  {
    label: "User Management",
    path: "/users",
    icon: <Users size={19} />,
    roles: ["ADMIN"],
  },
];

function getRoleLabel(role: string) {
  return role
    .split("_")
    .map(
      (word) => word.charAt(0) + word.slice(1).toLowerCase()
    )
    .join(" ");
}

function LoadingScreen() {
  return (
    <div className="min-vh-100 d-flex justify-content-center align-items-center">
      <div className="text-center">
        <div className="spinner-border text-primary mb-3"></div>
        <p className="text-muted">Loading KQuench...</p>
      </div>
    </div>
  );
}

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSubmitting(true);

    try {
      await login(username, password);

      // Navigate after authentication succeeds.
      navigate("/", { replace: true });
    } catch (err: any) {
      const data = err?.response?.data;

      setError(
        data?.detail ||
          data?.non_field_errors?.[0] ||
          "Login failed. Please check your credentials."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div
        className="card border-0 shadow-sm"
        style={{ width: "100%", maxWidth: 420 }}
      >
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-4">
            <h2 className="fw-bold text-primary">KQuench</h2>
            <p className="text-muted">
              Water Operations Management System
            </p>
          </div>

          {error && (
            <div className="alert alert-danger">{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div className="mb-4">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={submitting}
            >
              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}

function RoleRoute({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (!allowedRoles.includes(user.role as UserRole)) {
    return <Navigate to="/products" replace />;
  }

  return <>{children}</>;
}

function HomeRedirect() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (user.role === "ADMIN") {
    return <Dashboard />;
  }

  return <Navigate to="/products" replace />;
}

function Dashboard() {
  return (
    <div className="container-fluid py-4">
      <div className="mb-4">
        <h3 className="fw-bold mb-1">Dashboard</h3>
        <p className="text-muted mb-0">
          Overview of KQuench operations.
        </p>
      </div>

      <div className="row g-3">
        {[
          {
            title: "Products",
            description: "Manage bottled water products",
          },
          {
            title: "Supplier Receipts",
            description: "Record received stock",
          },
          {
            title: "Inventory",
            description: "Monitor available stock",
          },
          {
            title: "Sales",
            description: "Manage external sales",
          },
          {
            title: "Distribution",
            description: "Manage internal deliveries",
          },
          {
            title: "Predictions",
            description: "View future demand forecasts",
          },
        ].map((item) => (
          <div className="col-md-4" key={item.title}>
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h5 className="fw-semibold">{item.title}</h5>
                <p className="text-muted mb-0">
                  {item.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="container-fluid py-4">
      <div className="card border-0 shadow-sm">
        <div className="card-body p-5 text-center">
          <h3 className="fw-bold">{title}</h3>
          <p className="text-muted mb-0">
            This module will be connected to the backend.
          </p>
        </div>
      </div>
    </div>
  );
}

function MainLayout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return <Navigate to="/login" replace />;

  const visibleNavigation = navigation.filter((item) =>
    item.roles.includes(user.role as UserRole)
  );

  return (
    <div className="d-flex min-vh-100 bg-light">
      {sidebarOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-lg-none"
          style={{ zIndex: 1030 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`bg-dark text-white d-flex flex-column ${
          sidebarOpen ? "kquench-sidebar-open" : ""
        }`}
        style={{
          width: 255,
          minWidth: 255,
          zIndex: 1040,
        }}
      >
        <div className="px-4 py-4 border-bottom border-secondary d-flex justify-content-between align-items-center">
          <div>
            <h4 className="fw-bold mb-0">KQuench</h4>
            <small className="text-white-50">
              Operations System
            </small>
          </div>

          <button
            className="btn btn-sm btn-outline-light d-lg-none"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-grow-1 p-3">
          <small className="text-white-50 px-2 d-block mb-3">
            MAIN MENU
          </small>

          {visibleNavigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `d-flex align-items-center gap-3 text-decoration-none rounded px-3 py-3 mb-1 ${
                  isActive
                    ? "bg-primary text-white"
                    : "text-white-50"
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-top border-secondary">
          <div className="d-flex align-items-center gap-2 mb-3">
            <UserCircle size={28} />

            <div className="overflow-hidden">
              <div className="fw-semibold text-truncate">
                {user.username}
              </div>
              <small className="text-white-50">
                {getRoleLabel(user.role)}
              </small>
            </div>
          </div>

          <button
            className="btn btn-outline-light w-100 d-flex align-items-center justify-content-center gap-2"
            onClick={logout}
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-grow-1 min-vh-100 overflow-hidden">
        <header className="bg-white border-bottom px-3 px-md-4 py-3 d-flex justify-content-between align-items-center">
          <button
            className="btn btn-outline-secondary d-lg-none"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>

          <div className="d-none d-lg-block fw-semibold">
            KQuench Management
          </div>

          <div className="d-flex align-items-center gap-2">
            <UserCircle size={20} className="text-secondary" />
            <span className="small fw-semibold">
              {user.username}
            </span>
          </div>
        </header>

        <main className="p-3 p-md-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function ProductsAccess() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  return <Products role={user.role} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route index element={<HomeRedirect />} />

            <Route
              path="products"
              element={<ProductsAccess />}
            />

            <Route
              path="supplier-receipts"
              element={
                <RoleRoute
                  allowedRoles={[
                    "ADMIN",
                    "PRODUCTION_MANAGER",
                    "INVENTORY_MANAGER",
                  ]}
                >
                  <PlaceholderPage title="Supplier Receipts" />
                </RoleRoute>
              }
            />

            <Route
              path="inventory"
              element={<PlaceholderPage title="Inventory Management" />}
            />

            <Route
              path="sales"
              element={
                <RoleRoute
                  allowedRoles={[
                    "ADMIN",
                    "SALES_OFFICER",
                    "DISTRIBUTION_OFFICER",
                  ]}
                >
                  <PlaceholderPage title="Sales Management" />
                </RoleRoute>
              }
            />

            <Route
              path="distribution"
              element={
                <RoleRoute
                  allowedRoles={[
                    "ADMIN",
                    "DISTRIBUTION_OFFICER",
                  ]}
                >
                  <PlaceholderPage title="Distribution Management" />
                </RoleRoute>
              }
            />

            <Route
              path="predictions"
              element={<PlaceholderPage title="Predictive Analysis" />}
            />

            <Route
              path="users"
              element={
                <RoleRoute allowedRoles={["ADMIN"]}>
                  <PlaceholderPage title="User Management" />
                </RoleRoute>
              }
            />

            <Route
              path="*"
              element={<Navigate to="/" replace />}
            />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
