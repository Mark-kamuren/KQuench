
import { useEffect, useState, type FormEvent } from "react";
import {
  Droplets,
  Factory,
  RefreshCw,
  Plus,
} from "lucide-react";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

interface WaterReceipt {
  receipt_id: number;
  supplier_name: string;
  reference: string;
  received_date: string;
  quantity_received_litres: number;
  notes?: string;
}

interface Product {
  product_id: number;
  product_name: string;
  unit_size_ml: number;
  is_active: boolean;
}

interface BottlingBatch {
  bottling_batch_id: number;
  batch_number: string;
  water_receipt: number;
  water_receipt_reference?: string;
  product: number;
  product_name?: string;
  bottles_produced: number;
  finished_water_litres: number;
  water_used_litres: number;
  water_loss_litres: number;
  loss_percentage: number;
  bottling_date: string;
  notes?: string;
}

function extractList<T>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function errorMessage(error: any): string {
  const data = error?.response?.data;

  if (typeof data === "string") return data;
  if (data?.detail) return data.detail;
  if (data?.error) return data.error;

  if (data && typeof data === "object") {
    const firstValue = Object.values(data)[0];

    if (Array.isArray(firstValue)) {
      return String(firstValue[0]);
    }

    if (firstValue) return String(firstValue);
  }

  return "The operation could not be completed.";
}

function formatNumber(value: number | undefined): string {
  return Number(value || 0).toLocaleString("en-KE", {
    maximumFractionDigits: 2,
  });
}

export default function SupplierReceipts() {
  const { user } = useAuth();

  const canCreate = [
    "ADMIN",
    "PRODUCTION_MANAGER",
  ].includes(user?.role || "");

  const [receipts, setReceipts] = useState<WaterReceipt[]>([]);
  const [batches, setBatches] = useState<BottlingBatch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [activeTab, setActiveTab] = useState<
    "receipts" | "bottling"
  >("receipts");

  const [receiptDate, setReceiptDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [litresReceived, setLitresReceived] = useState("");
  const [receiptNotes, setReceiptNotes] = useState("");

  const [selectedReceipt, setSelectedReceipt] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [bottlesProduced, setBottlesProduced] = useState("");
  const [batchNotes, setBatchNotes] = useState("");

  const [submittingReceipt, setSubmittingReceipt] = useState(false);
  const [submittingBatch, setSubmittingBatch] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [receiptResponse, batchResponse, productResponse] =
        await Promise.all([
          api.get("water-receipts/"),
          api.get("bottling-batches/"),
          api.get("products/"),
        ]);

      setReceipts(extractList<WaterReceipt>(receiptResponse.data));
      setBatches(extractList<BottlingBatch>(batchResponse.data));
      setProducts(
        extractList<Product>(productResponse.data).filter(
          (product) => product.is_active
        )
      );
    } catch (err: any) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReceiptSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (Number(litresReceived) <= 0) {
      setError("Enter a valid water quantity.");
      return;
    }

    setSubmittingReceipt(true);

    try {
      await api.post("water-receipts/", {
        received_date: receiptDate,
        quantity_received_litres: Number(litresReceived),
        notes: receiptNotes,
      });

      setSuccess("Water receipt recorded successfully.");
      setLitresReceived("");
      setReceiptNotes("");
      await loadData();
    } catch (err: any) {
      setError(errorMessage(err));
    } finally {
      setSubmittingReceipt(false);
    }
  };

  const handleBatchSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedReceipt || !selectedProduct) {
      setError("Select a water receipt and a product.");
      return;
    }

    if (Number(bottlesProduced) <= 0) {
      setError("Enter a valid number of bottles.");
      return;
    }

    setSubmittingBatch(true);

    try {
      await api.post("bottling-batches/", {
        water_receipt: Number(selectedReceipt),
        product: Number(selectedProduct),
        bottles_produced: Number(bottlesProduced),
        notes: batchNotes,
      });

      setSuccess("Bottling batch recorded successfully.");
      setBottlesProduced("");
      setBatchNotes("");
      await loadData();
    } catch (err: any) {
      setError(errorMessage(err));
    } finally {
      setSubmittingBatch(false);
    }
  };

  const totalLitresReceived = receipts.reduce(
    (sum, receipt) =>
      sum + Number(receipt.quantity_received_litres || 0),
    0
  );

  const totalBottlesProduced = batches.reduce(
    (sum, batch) =>
      sum + Number(batch.bottles_produced || 0),
    0
  );

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" />
        <p className="text-secondary mt-3">
          Loading water operations...
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">
            Water Receipts & Bottling
          </h2>
          <p className="text-secondary mb-0">
            Record raw water supplies and finished bottled products.
          </p>
        </div>

        <button
          className="btn btn-outline-primary btn-sm"
          onClick={loadData}
        >
          <RefreshCw size={15} className="me-2" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible">
          {error}
          <button
            className="btn-close"
            onClick={() => setError("")}
            aria-label="Dismiss"
          />
        </div>
      )}

      {success && (
        <div className="alert alert-success alert-dismissible">
          {success}
          <button
            className="btn-close"
            onClick={() => setSuccess("")}
            aria-label="Dismiss"
          />
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-12 col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
              <div className="d-flex align-items-center gap-3">
                <div className="bg-primary bg-opacity-10 text-primary rounded-3 p-3">
                  <Droplets size={24} />
                </div>
                <div>
                  <div className="text-secondary small">
                    Total Water Received
                  </div>
                  <h4 className="fw-bold mb-0">
                    {formatNumber(totalLitresReceived)} L
                  </h4>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
              <div className="d-flex align-items-center gap-3">
                <div className="bg-success bg-opacity-10 text-success rounded-3 p-3">
                  <Factory size={24} />
                </div>
                <div>
                  <div className="text-secondary small">
                    Total Bottles Produced
                  </div>
                  <h4 className="fw-bold mb-0">
                    {formatNumber(totalBottlesProduced)}
                  </h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white p-3">
          <ul className="nav nav-pills gap-2">
            <li className="nav-item">
              <button
                className={`nav-link ${
                  activeTab === "receipts" ? "active" : ""
                }`}
                onClick={() => setActiveTab("receipts")}
              >
                <Droplets size={16} className="me-2" />
                Water Receipts
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${
                  activeTab === "bottling" ? "active" : ""
                }`}
                onClick={() => setActiveTab("bottling")}
              >
                <Factory size={16} className="me-2" />
                Bottling Batches
              </button>
            </li>
          </ul>
        </div>

        <div className="card-body p-4">
          {activeTab === "receipts" && (
            <>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0">
                  Nairobi Water Receipts
                </h5>
              </div>

              {canCreate && (
                <form
                  onSubmit={handleReceiptSubmit}
                  className="row g-3 mb-4 p-3 bg-light rounded-3"
                >
                  <div className="col-12 col-md-4">
                    <label className="form-label">
                      Receipt Date
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={receiptDate}
                      onChange={(event) =>
                        setReceiptDate(event.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label">
                      Quantity Received (Litres)
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      className="form-control"
                      value={litresReceived}
                      onChange={(event) =>
                        setLitresReceived(event.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label">
                      Supplier
                    </label>
                    <input
                      className="form-control"
                      value="Nairobi Water"
                      disabled
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label">
                      Notes
                    </label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={receiptNotes}
                      onChange={(event) =>
                        setReceiptNotes(event.target.value)
                      }
                    />
                  </div>

                  <div className="col-12">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submittingReceipt}
                    >
                      <Plus size={16} className="me-2" />
                      {submittingReceipt
                        ? "Recording..."
                        : "Record Water Receipt"}
                    </button>
                  </div>
                </form>
              )}

              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Reference</th>
                      <th>Supplier</th>
                      <th>Date</th>
                      <th>Quantity Received</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map((receipt) => (
                      <tr key={receipt.receipt_id}>
                        <td className="fw-semibold">
                          {receipt.reference || `#${receipt.receipt_id}`}
                        </td>
                        <td>{receipt.supplier_name}</td>
                        <td>{receipt.received_date}</td>
                        <td>
                          {formatNumber(
                            receipt.quantity_received_litres
                          )} L
                        </td>
                        <td>{receipt.notes || "—"}</td>
                      </tr>
                    ))}

                    {receipts.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center text-secondary py-4">
                          No water receipts recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === "bottling" && (
            <>
              <h5 className="fw-bold mb-3">Bottling Batches</h5>

              {canCreate && (
                <form
                  onSubmit={handleBatchSubmit}
                  className="row g-3 mb-4 p-3 bg-light rounded-3"
                >
                  <div className="col-12 col-md-4">
                    <label className="form-label">
                      Water Receipt
                    </label>
                    <select
                      className="form-select"
                      value={selectedReceipt}
                      onChange={(event) =>
                        setSelectedReceipt(event.target.value)
                      }
                      required
                    >
                      <option value="">Select water receipt</option>
                      {receipts.map((receipt) => (
                        <option
                          key={receipt.receipt_id}
                          value={receipt.receipt_id}
                        >
                          {receipt.reference} — {receipt.received_date}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label">
                      Finished Product
                    </label>
                    <select
                      className="form-select"
                      value={selectedProduct}
                      onChange={(event) =>
                        setSelectedProduct(event.target.value)
                      }
                      required
                    >
                      <option value="">Select product</option>
                      {products.map((product) => (
                        <option
                          key={product.product_id}
                          value={product.product_id}
                        >
                          {product.product_name} ({product.unit_size_ml} ml)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label">
                      Bottles Produced
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className="form-control"
                      value={bottlesProduced}
                      onChange={(event) =>
                        setBottlesProduced(event.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Notes</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={batchNotes}
                      onChange={(event) =>
                        setBatchNotes(event.target.value)
                      }
                    />
                  </div>

                  <div className="col-12">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={
                        submittingBatch ||
                        receipts.length === 0 ||
                        products.length === 0
                      }
                    >
                      <Plus size={16} className="me-2" />
                      {submittingBatch
                        ? "Recording..."
                        : "Record Bottling Batch"}
                    </button>
                  </div>
                </form>
              )}

              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Batch</th>
                      <th>Product</th>
                      <th>Water Receipt</th>
                      <th>Bottles</th>
                      <th>Finished Water</th>
                      <th>Water Used</th>
                      <th>Water Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((batch) => (
                      <tr key={batch.bottling_batch_id}>
                        <td className="fw-semibold">
                          {batch.batch_number || `#${batch.bottling_batch_id}`}
                        </td>
                        <td>{batch.product_name || batch.product}</td>
                        <td>
                          {batch.water_receipt_reference ||
                            batch.water_receipt}
                        </td>
                        <td>{formatNumber(batch.bottles_produced)}</td>
                        <td>
                          {formatNumber(batch.finished_water_litres)} L
                        </td>
                        <td>
                          {formatNumber(batch.water_used_litres)} L
                        </td>
                        <td>
                          {formatNumber(batch.water_loss_litres)} L
                        </td>
                      </tr>
                    ))}

                    {batches.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center text-secondary py-4">
                          No bottling batches recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
