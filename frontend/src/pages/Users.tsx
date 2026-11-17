
import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Form,
  Modal,
  Spinner,
  Table,
} from "react-bootstrap";
import { Plus, Pencil, UserCheck, UserX } from "lucide-react";
import api from "../services/api";

type UserRecord = {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  date_joined: string;
};

const roles = [
  { value: "ADMIN", label: "Administrator" },
  { value: "PRODUCTION_MANAGER", label: "Production Manager" },
  { value: "INVENTORY_MANAGER", label: "Inventory Manager" },
  { value: "SALES_OFFICER", label: "Sales Officer" },
  { value: "DISTRIBUTION_OFFICER", label: "Distribution Officer" },
];

const emptyForm = {
  username: "",
  email: "",
  password: "",
  role: "INVENTORY_MANAGER",
  is_active: true,
};

const getError = (error: any) => {
  const data = error?.response?.data;
  if (!data) return "Something went wrong. Please try again.";
  if (typeof data === "string") return data;
  return Object.entries(data)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : typeof value === "object" ? JSON.stringify(value) : value}`)
    .join(" | ");
};

export default function Users() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [form, setForm] = useState(emptyForm);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get("users/");
      setUsers(Array.isArray(response.data) ? response.data : response.data.results || []);
      setError("");
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (user: UserRecord) => {
    setEditingUser(user);
    setForm({
      username: user.username,
      email: user.email || "",
      password: "",
      role: user.role,
      is_active: user.is_active,
    });
    setShowModal(true);
  };

  const saveUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editingUser) {
        const payload: Record<string, unknown> = {
          username: form.username,
          email: form.email,
          role: form.role,
          is_active: form.is_active,
        };

        if (form.password.trim()) payload.password = form.password;

        await api.patch(`users/${editingUser.id}/`, payload);
        setSuccess("User account updated successfully.");
      } else {
        if (!form.password.trim()) {
          setError("A password is required when creating a user.");
          setSaving(false);
          return;
        }

        await api.post("users/", form);
        setSuccess("User account created successfully.");
      }

      setShowModal(false);
      await loadUsers();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleUser = async (user: UserRecord) => {
    const action = user.is_active ? "deactivate" : "activate";
    if (!window.confirm(`Are you sure you want to ${action} ${user.username}?`)) return;

    setError("");
    setSuccess("");

    try {
      await api.patch(`users/${user.id}/`, { is_active: !user.is_active });
      setSuccess(`User ${action}d successfully.`);
      await loadUsers();
    } catch (err) {
      setError(getError(err));
    }
  };

  return (
    <div className="container-fluid py-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold mb-1">User Management</h3>
          <p className="text-muted mb-0">Create accounts and manage system access and roles.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={17} className="me-2" />
          Add User
        </Button>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError("")}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess("")}>{success}</Alert>}

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <Card className="border-0 shadow-sm"><Card.Body>
            <div className="text-muted small">Total users</div>
            <h3 className="fw-bold mb-0">{users.length}</h3>
          </Card.Body></Card>
        </div>
        <div className="col-md-4">
          <Card className="border-0 shadow-sm"><Card.Body>
            <div className="text-muted small">Active accounts</div>
            <h3 className="fw-bold mb-0">{users.filter((u) => u.is_active).length}</h3>
          </Card.Body></Card>
        </div>
        <div className="col-md-4">
          <Card className="border-0 shadow-sm"><Card.Body>
            <div className="text-muted small">Inactive accounts</div>
            <h3 className="fw-bold mb-0">{users.filter((u) => !u.is_active).length}</h3>
          </Card.Body></Card>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white py-3">
          <h5 className="mb-0 fw-semibold">Registered Users</h5>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5"><Spinner animation="border" /></div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Date joined</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-muted py-5">No users found.</td></tr>
                  ) : users.map((user) => (
                    <tr key={user.id}>
                      <td className="fw-semibold">{user.username}</td>
                      <td>{user.email || "—"}</td>
                      <td>{roles.find((r) => r.value === user.role)?.label || user.role}</td>
                      <td>{new Date(user.date_joined).toLocaleDateString()}</td>
                      <td><Badge bg={user.is_active ? "success" : "secondary"}>{user.is_active ? "Active" : "Inactive"}</Badge></td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button size="sm" variant="outline-primary" onClick={() => openEdit(user)}>
                            <Pencil size={14} className="me-1" /> Edit
                          </Button>
                          <Button size="sm" variant={user.is_active ? "outline-danger" : "outline-success"} onClick={() => toggleUser(user)}>
                            {user.is_active ? <><UserX size={14} className="me-1" /> Deactivate</> : <><UserCheck size={14} className="me-1" /> Activate</>}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Form onSubmit={saveUser}>
          <Modal.Header closeButton>
            <Modal.Title>{editingUser ? "Edit User" : "Create User Account"}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Username</Form.Label>
              <Form.Control required value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email address</Form.Label>
              <Form.Control type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>{editingUser ? "New password (leave blank to keep current)" : "Password"}</Form.Label>
              <Form.Control type="password" required={!editingUser} value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>System role</Form.Label>
              <Form.Select value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Check type="switch" label="Account is active" checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : editingUser ? "Save Changes" : "Create Account"}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}