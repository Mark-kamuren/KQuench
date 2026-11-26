
import { useState, type FormEvent, type ReactNode } from "react";
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
  Warehouse,
  ShoppingCart,
  Truck,
  ChartNoAxesCombined,
  Users,
  LogOut,
  Menu,
  X,
  Droplets,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

import { useAuth } from "./context/AuthContext";

import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import SupplierReceipts from "./pages/SupplierReceipts";
import Inventory from "./pages/Inventory";
import Sales from "./pages/Sales";
import Distribution from "./pages/Distribution";
import Predictions from "./pages/Predictions";
import UsersPage from "./pages/Users";

import "./App.css";

type Role =
  | "ADMIN"
  | "PRODUCTION_MANAGER"
  | "INVENTORY_MANAGER"
  | "SALES_OFFICER"
  | "DISTRIBUTION_OFFICER";

interface NavigationItem {
  label: string;
  path: string;
  icon: ReactNode;
  roles: Role[];
}

const ALL_ROLES: Role[] = [
  "ADMIN",
  "PRODUCTION_MANAGER",
  "INVENTORY_MANAGER",
  "SALES_OFFICER",
  "DISTRIBUTION_OFFICER",
];

const navigation: NavigationItem[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: <LayoutDashboard size={19} />,
    roles: ["ADMIN"],
  },
  {
    label: "Products",
    path: "/products",
    icon: <Package size={19} />,
    roles: ALL_ROLES,
  },
  {
    label: "Water Receipts & Bottling",
    path: "/receipts",
    icon: <Droplets size={19} />,
    roles: ["ADMIN", "PRODUCTION_MANAGER", "INVENTORY_MANAGER"],
  },
  {
    label: "Inventory",
    path: "/inventory",
    icon: <Warehouse size={19} />,
    roles: ALL_ROLES,
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
    icon: <ChartNoAxesCombined size={19} />,
    roles: ALL_ROLES,
  },
  {
    label: "User Management",
    path: "/users",
    icon: <Users size={19} />,
    roles: ["ADMIN"],
  },
];

function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner-border text-primary" />
        <p>Loading KQuench...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function RoleRoute({
  roles,
  children,
}: {
  roles: Role[];
  children: ReactNode;
}) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(user.role as Role)) {
    return <Navigate to="/products" replace />;
  }

  return <>{children}</>;
}

function HomeRedirect() {
  const { user } = useAuth();

  return (
    <Navigate
      to={user?.role === "ADMIN" ? "/dashboard" : "/products"}
      replace
    />
  );
}


function Login() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (!loading && user) {
    return <HomeRedirect />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(username.trim(), password);
      navigate("/", { replace: true });
    } catch (err: any) {
      const data = err?.response?.data;
      setError(
        data?.detail ||
        data?.non_field_errors?.[0] ||
        data?.username?.[0] ||
        "Unable to sign in. Check your username and password."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <section className="auth-showcase">
        <div className="auth-brand">
          <div className="auth-logo">
            <Droplets size={30} />
          </div>
          <span>KQuench</span>
        </div>

        <div className="auth-showcase-content">
          <span className="auth-eyebrow">WATER OPERATIONS MANAGEMENT</span>
          <h1>Managing water operations with clarity and control.</h1>
          <p>
            A central platform for managing water receipts,
            bottling, inventory, sales and distribution.
          </p>

          <div className="auth-feature">
            <ShieldCheck size={21} />
            <span>Secure, role-based system access</span>
          </div>
        </div>

        <div className="auth-showcase-footer">
          KQuench Operations Management System
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-form-container">
          <div className="auth-mobile-brand">
            <Droplets size={25} />
            <strong>KQuench</strong>
          </div>

          <span className="auth-welcome">WELCOME BACK</span>
          <h2>Sign in to your account</h2>
          <p className="auth-description">
            Enter your credentials to access your workspace.
          </p>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                required
                disabled={submitting}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <div className="auth-password-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={submitting || !username.trim() || !password}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={19} />
                </>
              )}
            </button>
          </form>

          <div className="auth-security">
            <ShieldCheck size={17} />
            <span>Your account is protected by secure authentication.</span>
          </div>
        </div>

        <div className="auth-panel-footer">
          © 2026 KQuench. All rights reserved.
        </div>
      </section>
    </div>
  );
}


function MainLayout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleNavigation = navigation.filter((item) =>
    item.roles.includes(user?.role as Role)
  );

  return (
    <div className="kquench-layout">
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`kquench-sidebar ${
          sidebarOpen ? "kquench-sidebar-open" : ""
        }`}
      >
        <div className="sidebar-brand">
          <div className="brand-icon">
            <Droplets size={25} />
          </div>

          <div>
            <h4>KQuench</h4>
            <span>Water Management</span>
          </div>

          <button
            type="button"
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-section-label">
          MAIN MENU
        </div>

        <nav className="sidebar-navigation">
          {visibleNavigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">
              {(user?.username || "U").charAt(0).toUpperCase()}
            </div>

            <div className="user-details">
              <strong>{user?.username}</strong>
              <span>
                {user?.role?.replaceAll("_", " ")}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={logout}
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="kquench-main">
        <header className="kquench-topbar">
          <button
            type="button"
            className="mobile-menu-button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={23} />
          </button>

          <div className="topbar-heading">
            <strong>KQuench Operations</strong>
            <span>
              Water production, inventory and distribution
            </span>
          </div>

          <div className="topbar-account">
            <span>{user?.username}</span>
          </div>
        </header>

        <div className="page-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomeRedirect />} />

          <Route
            path="/dashboard"
            element={
              <RoleRoute roles={["ADMIN"]}>
                <Dashboard />
              </RoleRoute>
            }
          />

          <Route
            path="/products"
            element={
              <RoleRoute roles={ALL_ROLES}>
                <Products role={user?.role || ""} />
              </RoleRoute>
            }
          />

          <Route
            path="/receipts"
            element={
              <RoleRoute
                roles={[
                  "ADMIN",
                  "PRODUCTION_MANAGER",
                  "INVENTORY_MANAGER",
                ]}
              >
                <SupplierReceipts />
              </RoleRoute>
            }
          />

          <Route
            path="/inventory"
            element={
              <RoleRoute roles={ALL_ROLES}>
                <Inventory />
              </RoleRoute>
            }
          />

          <Route
            path="/sales"
            element={
              <RoleRoute
                roles={[
                  "ADMIN",
                  "SALES_OFFICER",
                  "DISTRIBUTION_OFFICER",
                ]}
              >
                <Sales />
              </RoleRoute>
            }
          />

          <Route
            path="/distribution"
            element={
              <RoleRoute
                roles={["ADMIN", "DISTRIBUTION_OFFICER"]}
              >
                <Distribution />
              </RoleRoute>
            }
          />

          <Route
            path="/predictions"
            element={
              <RoleRoute roles={ALL_ROLES}>
                <Predictions />
              </RoleRoute>
            }
          />

          <Route
            path="/users"
            element={
              <RoleRoute roles={["ADMIN"]}>
                <UsersPage />
              </RoleRoute>
            }
          />
        </Route>
      </Route>

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

