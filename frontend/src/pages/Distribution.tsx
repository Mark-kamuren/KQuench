
import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
  Modal,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import { Plus, Truck, MapPin, CheckCircle } from "lucide-react";
import api from "../services/api";

type Product = {
  product_id: number;
  product_name: string;
  unit_size_ml?: number;
};

type Destination = {
  destination_id: number;
  destination_name: string;
  destination_type: string;
  description?: string;
  is_active: boolean;
};

type DistributionItem = {
  distribution_item_id: number;
  product: number | null;
  product_name: string;
  quantity_dispatched: number;
};

type DistributionRecord = {
  distribution_id: number;
  distribution_type: string;
  destination: number | null;
  destination_name?: string;
  sale: number | null;
  distribution_date: string;
  dispatch_date: string | null;
  vehicle_number: string;
  driver_name: string;
  status: string;
  notes: string;
  items: DistributionItem[];
};

const destinationTypes = [
  { value: "AIRLINE_OPERATIONS", label: "Airline Operations" },
  { value: "AIRCRAFT", label: "Aircraft" },
  { value: "LOUNGE", label: "Lounge" },
  { value: "CAFE", label: "Cafe" },
  { value: "OTHER", label: "Other" },
];

const getError = (error: any) => {
  const data = error?.response?.data;
  if (!data) return "Something went wrong. Please try again.";
  if (typeof data === "string") return data;
  return Object.entries(data)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : typeof value === "object" ? JSON.stringify(value) : value}`)
    .join(" | ");
};

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleString() : "—";

export default function Distribution() {
  const [distributions, setDistributions] = useState<DistributionRecord[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showDistribution, setShowDistribution] = useState(false);
  const [showDestination, setShowDestination] = useState(false);

  const [destinationForm, setDestinationForm] = useState({
    destination_name: "",
    destination_type: "AIRLINE_OPERATIONS",
    description: "",
  });

  const [distributionForm, setDistributionForm] = useState({
    destination: "",
    vehicle_number: "",
    driver_name: "",
    notes: "",
    product: "",
    quantity_dispatched: "1",
  });

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [distributionRes, destinationRes, productRes] = await Promise.all([
        api.get("distributions/"),
        api.get("destinations/"),
        api.get("products/"),
      ]);

      setDistributions(Array.isArray(distributionRes.data) ? distributionRes.data : distributionRes.data.results || []);
      setDestinations(Array.isArray(destinationRes.data) ? destinationRes.data : destinationRes.data.results || []);
      setProducts(Array.isArray(productRes.data) ? productRes.data : productRes.data.results || []);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const createDestination = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await api.post("destinations/", {
        ...destinationForm,
        is_active: true,
      });
      setSuccess("Destination created successfully.");
      setDestinationForm({
        destination_name: "",
        destination_type: "AIRLINE_OPERATIONS",
        description: "",
      });
      setShowDestination(false);
      await loadData();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  };

  const createDistribution = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (!distributionForm.destination || !distributionForm.product) {
        setError("Select a destination and product.");
        setSaving(false);
        return;
      }

      const now = new Date().toISOString();

      await api.post("distributions/", {
        distribution_type: "INTERNAL",
        destination: Number(distributionForm.destination),
        sale: null,
        distribution_date: now,
        vehicle_number: distributionForm.vehicle_number,
        driver_name: distributionForm.driver_name,
        notes: distributionForm.notes,
        items: [
          {
            product: Number(distributionForm.product),
            quantity_dispatched: Number(distributionForm.quantity_dispatched),
          },
        ],
      });

      setSuccess("Internal distribution created successfully. Dispatch it when ready.");
      setDistributionForm({
        destination: "",
        vehicle_number: "",
        driver_name: "",
        notes: "",
        product: "",
        quantity_dispatched: "1",
      });
      setShowDistribution(false);
      await loadData();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  };

  const performAction = async (
    distributionId: number,
    action: "dispatch" | "complete"
  ) => {
    const message =
      action === "dispatch"
        ? "Dispatch this distribution? Stock will be deducted."
        : "Mark this delivery as completed?";

    if (!window.confirm(message)) return;

    setError("");
    setSuccess("");

    try {
      await api.post(`distributions/${distributionId}/${action}/`, {});
      setSuccess(
        action === "dispatch"
          ? "Distribution dispatched successfully."
          : "Delivery marked as completed."
      );
      await loadData();
    } catch (err) {
      setError(getError(err));
    }
  };

  const internalDistributions = distributions.filter(
    (item) => item.distribution_type === "INTERNAL"
  );

  return (
    <div className="container-fluid py-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h3 className="fw-bold mb-1">Distribution Management</h3>
          <p className="text-muted mb-0">
            Manage internal bottled-water deliveries to airline destinations.
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-primary" onClick={() => setShowDestination(true)}>
            <MapPin size={17} className="me-2" />
            Add Destination
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowDistribution(true)}
            disabled={!destinations.some((d) => d.is_active) || products.length === 0}
          >
            <Plus size={17} className="me-2" />
            New Distribution
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError("")}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess("")}>{success}</Alert>}

      <Row className="g-3 mb-4">
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small">Internal distributions</div>
              <h3 className="fw-bold mb-0">{internalDistributions.length}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small">Active destinations</div>
              <h3 className="fw-bold mb-0">{destinations.filter((d) => d.is_active).length}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small">Pending deliveries</div>
              <h3 className="fw-bold mb-0">
                {internalDistributions.filter((d) => d.status === "PENDING").length}
              </h3>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-white py-3">
          <h5 className="mb-0 fw-semibold">Internal Deliveries</h5>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5"><Spinner animation="border" /></div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Reference</th>
                    <th>Destination</th>
                    <th>Items</th>
                    <th>Vehicle / Driver</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {internalDistributions.length === 0 ? (
                    <tr><td colSpan={7} className="text-center text-muted py-5">No internal distributions recorded yet.</td></tr>
                  ) : (
                    internalDistributions.map((item) => (
                      <tr key={item.distribution_id}>
                        <td className="fw-semibold">DIST-{item.distribution_id}</td>
                        <td>{item.destination_name || `Destination #${item.destination ?? "—"}`}</td>
                        <td>
                          {item.items?.map((line) => (
                            <div key={line.distribution_item_id}>
                              {line.product_name} × {line.quantity_dispatched}
                            </div>
                          ))}
                        </td>
                        <td>
                          <div>{item.vehicle_number || "—"}</div>
                          <small className="text-muted">{item.driver_name || "—"}</small>
                        </td>
                        <td>{formatDate(item.distribution_date)}</td>
                        <td>
                          <Badge bg={
                            item.status === "COMPLETED" ? "success" :
                            item.status === "DISPATCHED" ? "info" : "warning"
                          }>
                            {item.status}
                          </Badge>
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            {item.status === "PENDING" && (
                              <Button size="sm" variant="outline-primary" onClick={() => performAction(item.distribution_id, "dispatch")}>
                                <Truck size={15} className="me-1" /> Dispatch
                              </Button>
                            )}
                            {item.status === "DISPATCHED" && (
                              <Button size="sm" variant="outline-success" onClick={() => performAction(item.distribution_id, "complete")}>
                                <CheckCircle size={15} className="me-1" /> Complete
                              </Button>
                            )}
                            {item.status === "COMPLETED" && <span className="text-success small">Completed</span>}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white py-3"><h5 className="mb-0 fw-semibold">Delivery Destinations</h5></Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0 align-middle">
              <thead className="table-light">
                <tr><th>Destination</th><th>Type</th><th>Description</th><th>Status</th></tr>
              </thead>
              <tbody>
                {destinations.length === 0 ? (
                  <tr><td colSpan={4} className="text-center text-muted py-4">No destinations registered. Add your first destination.</td></tr>
                ) : destinations.map((destination) => (
                  <tr key={destination.destination_id}>
                    <td className="fw-semibold">{destination.destination_name}</td>
                    <td>{destinationTypes.find((t) => t.value === destination.destination_type)?.label || destination.destination_type}</td>
                    <td>{destination.description || "—"}</td>
                    <td><Badge bg={destination.is_active ? "success" : "secondary"}>{destination.is_active ? "Active" : "Inactive"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      <Modal show={showDestination} onHide={() => setShowDestination(false)} centered>
        <Form onSubmit={createDestination}>
          <Modal.Header closeButton><Modal.Title>Add Destination</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Destination name</Form.Label>
              <Form.Control required maxLength={150} value={destinationForm.destination_name}
                onChange={(e) => setDestinationForm({ ...destinationForm, destination_name: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Destination type</Form.Label>
              <Form.Select value={destinationForm.destination_type}
                onChange={(e) => setDestinationForm({ ...destinationForm, destination_type: e.target.value })}>
                {destinationTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={3} value={destinationForm.description}
                onChange={(e) => setDestinationForm({ ...destinationForm, description: e.target.value })} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDestination(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Destination"}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showDistribution} onHide={() => setShowDistribution(false)} centered>
        <Form onSubmit={createDistribution}>
          <Modal.Header closeButton><Modal.Title>New Internal Distribution</Modal.Title></Modal.Header>
          <Modal.Body>
            <Alert variant="info" className="small">
              This records an internal airline delivery. Stock is deducted when the distribution is dispatched.
            </Alert>
            <Form.Group className="mb-3">
              <Form.Label>Destination</Form.Label>
              <Form.Select required value={distributionForm.destination}
                onChange={(e) => setDistributionForm({ ...distributionForm, destination: e.target.value })}>
                <option value="">Select destination</option>
                {destinations.filter((d) => d.is_active).map((d) => (
                  <option key={d.destination_id} value={d.destination_id}>{d.destination_name}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Product</Form.Label>
              <Form.Select required value={distributionForm.product}
                onChange={(e) => setDistributionForm({ ...distributionForm, product: e.target.value })}>
                <option value="">Select product</option>
                {products.map((p) => <option key={p.product_id} value={p.product_id}>{p.product_name}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Quantity</Form.Label>
              <Form.Control type="number" min="1" required value={distributionForm.quantity_dispatched}
                onChange={(e) => setDistributionForm({ ...distributionForm, quantity_dispatched: e.target.value })} />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Vehicle number</Form.Label>
                  <Form.Control value={distributionForm.vehicle_number}
                    onChange={(e) => setDistributionForm({ ...distributionForm, vehicle_number: e.target.value })} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Driver name</Form.Label>
                  <Form.Control value={distributionForm.driver_name}
                    onChange={(e) => setDistributionForm({ ...distributionForm, driver_name: e.target.value })} />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group>
              <Form.Label>Notes</Form.Label>
              <Form.Control as="textarea" rows={2} value={distributionForm.notes}
                onChange={(e) => setDistributionForm({ ...distributionForm, notes: e.target.value })} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDistribution(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || destinations.filter((d) => d.is_active).length === 0 || products.length === 0}>
              {saving ? "Saving..." : "Create Distribution"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
