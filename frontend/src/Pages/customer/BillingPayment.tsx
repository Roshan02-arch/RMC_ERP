import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import { normalizeRole } from "../../utils/auth";

type Order = {
  id: number;
  orderId: string;
  grade: string;
  quantity: number;
  totalPrice?: number;
  status: string;
  deliveryDate?: string;
  expectedArrivalTime?: string;
  address?: string;
};

type PaymentRecord = {
  id?: number;
  orderId: string;
  amount: number;
  method: string;
  paidAt: string;
  transactionId: string;
};

type RawMaterialOrder = {
  id: number;
  materialName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  address: string;
  status: string;
  createdAt: string;
};

const RATE_MAP: Record<string, number> = {
  M20: 5000,
  M25: 5500,
  M30: 6000,
  M35: 6500,
};

const GST_RATE = 18;
const formatCurrency = (value: number) =>
  `Rs.${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const isCodPayment = (method: string) => method.trim().toUpperCase().startsWith("CASH_ON_DELIVERY");
const isDeliveredOrder = (status: string) => String(status || "").trim().toUpperCase() === "DELIVERED";

const BillingPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state as {
    successMessage?: string;
    selectedOrderId?: string;
    selectedRawOrderId?: number;
  } | null) || null;

  const lockedOrderId = navState?.selectedOrderId || "";
  const lockedRawOrderId = Number(navState?.selectedRawOrderId || 0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [rawOrders, setRawOrders] = useState<RawMaterialOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [message, setMessage] = useState(navState?.successMessage || "");

  const customerName = localStorage.getItem("username") || "Customer";
  const customerEmail = localStorage.getItem("userEmail") || "-";
  const customerPhone = localStorage.getItem("userNumber") || "-";
  const customerAddress = localStorage.getItem("userAddress") || "-";

  useEffect(() => {
    const role = normalizeRole(localStorage.getItem("role"));
    const userId = localStorage.getItem("userId");
    if (role !== "CUSTOMER" || !userId) {
      navigate("/login");
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const [concreteRes, rawRes] = await Promise.all([
          fetch(`http://localhost:8080/api/orders/my-orders/${userId}`),
          fetch(`http://localhost:8080/api/inventory/raw-material-orders/${userId}`),
        ]);

        const [concreteData, rawData] = await Promise.all([concreteRes.json(), rawRes.json()]);
        let concreteItems: Order[] = Array.isArray(concreteData) ? concreteData : [];
        let rawItems: RawMaterialOrder[] = Array.isArray(rawData) ? rawData : [];

        concreteItems.sort((a: Order, b: Order) => b.id - a.id);
        rawItems.sort((a, b) => b.id - a.id);

        if (lockedOrderId) {
          concreteItems = concreteItems.filter((o) => o.orderId === lockedOrderId);
        }
        if (lockedRawOrderId > 0) {
          rawItems = rawItems.filter((o) => o.id === lockedRawOrderId);
        }

        setOrders(concreteItems);
        setRawOrders(rawItems);

        if (lockedOrderId && concreteItems.length > 0) {
          setSelectedOrderId(concreteItems[0].orderId);
          return;
        }
        if (lockedRawOrderId > 0 && rawItems.length > 0) {
          setSelectedOrderId(`RAW:${rawItems[0].id}`);
          return;
        }
        if (concreteItems.length > 0) {
          setSelectedOrderId(concreteItems[0].orderId);
        } else if (rawItems.length > 0) {
          setSelectedOrderId(`RAW:${rawItems[0].id}`);
        }
      } catch (error) {
        console.error("Failed to load billing data", error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [navigate, lockedOrderId, lockedRawOrderId]);

  const selectedOrder = useMemo(
    () => orders.find((o) => o.orderId === selectedOrderId) || null,
    [orders, selectedOrderId]
  );
  const selectedRawOrder = useMemo(() => {
    if (!selectedOrderId.startsWith("RAW:")) return null;
    const id = Number(selectedOrderId.replace("RAW:", ""));
    return rawOrders.find((o) => o.id === id) || null;
  }, [rawOrders, selectedOrderId]);
  const isRawInvoice = Boolean(selectedRawOrder);
  const rawRatePerUnit = selectedRawOrder ? Number(selectedRawOrder.pricePerUnit || 0) : 0;

  const ratePerCubicMeter = selectedOrder ? RATE_MAP[selectedOrder.grade] || 0 : 0;
  const subtotal = selectedOrder
    ? selectedOrder.totalPrice && selectedOrder.totalPrice > 0
      ? selectedOrder.totalPrice
      : ratePerCubicMeter * selectedOrder.quantity
    : isRawInvoice
    ? selectedRawOrder!.totalPrice && selectedRawOrder!.totalPrice > 0
      ? selectedRawOrder!.totalPrice
      : rawRatePerUnit * selectedRawOrder!.quantity
    : 0;
  const gstAmount = (subtotal * GST_RATE) / 100;
  const totalPayable = subtotal + gstAmount;

  const selectedOrderPayments = useMemo(
    () => paymentHistory.filter((p) => p.orderId === selectedOrderId),
    [paymentHistory, selectedOrderId]
  );
  const hasCodPayment = selectedOrderPayments.some((p) => isCodPayment(p.method));
  const hasOnlinePaidPayment = selectedOrderPayments.some((p) => !isCodPayment(p.method));
  const paymentTarget = subtotal;
  const codDelivered = Boolean(selectedOrder && isDeliveredOrder(selectedOrder.status));
  const totalPaid = hasOnlinePaidPayment ? paymentTarget : codDelivered ? paymentTarget : 0;
  const outstanding = Math.max(0, paymentTarget - totalPaid);
  const paymentStatus = isRawInvoice
    ? "PENDING"
    : hasOnlinePaidPayment
    ? "COMPLETED_SUCCESSFULLY"
    : hasCodPayment && codDelivered
    ? "COMPLETED_SUCCESSFULLY"
    : hasCodPayment
    ? "PENDING"
    : codDelivered
    ? "COMPLETED_SUCCESSFULLY"
    : "PENDING";
  const paymentMethodLabel = hasOnlinePaidPayment
    ? "UPI / BANK TRANSFER"
    : hasCodPayment || !selectedOrderPayments.length
    ? "CASH ON DELIVERY"
    : "CASH ON DELIVERY";

  useEffect(() => {
    const fetchPayments = async () => {
      if (!selectedOrderId || selectedOrderId.startsWith("RAW:")) {
        setPaymentHistory([]);
        return;
      }
      try {
        const response = await fetch(`http://localhost:8080/api/orders/${selectedOrderId}/payments`);
        if (!response.ok) {
          setPaymentHistory([]);
          return;
        }
        const data: PaymentRecord[] = await response.json();
        setPaymentHistory(Array.isArray(data) ? data : []);
      } catch {
        setPaymentHistory([]);
      }
    };
    void fetchPayments();
  }, [selectedOrderId]);

  const handleDownloadPdf = () => {
    if (!selectedOrder && !selectedRawOrder) return;
    try {
      setDownloadingPdf(true);
      const pdf = new jsPDF("p", "mm", "a4");
      let y = 20;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.text("RMC ERP - TAX INVOICE", 14, y);
      y += 10;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      const invoiceRef = selectedOrder ? selectedOrder.orderId : `RMO-${selectedRawOrder!.id}`;
      pdf.text(`Invoice No: INV-${invoiceRef}`, 14, y);
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, 140, y);
      y += 8;
      pdf.text(`Order ID: ${invoiceRef}`, 14, y);
      y += 8;
      pdf.text(`Customer: ${customerName}`, 14, y);
      y += 6;
      pdf.text(`Email: ${customerEmail}`, 14, y);
      y += 6;
      pdf.text(`Phone: ${customerPhone}`, 14, y);
      y += 10;

      pdf.setDrawColor(220, 220, 220);
      pdf.rect(14, y, 182, 10);
      pdf.text("Description", 16, y + 7);
      pdf.text("Qty", 110, y + 7);
      pdf.text("Rate", 135, y + 7);
      pdf.text("Amount", 165, y + 7);
      y += 10;

      pdf.rect(14, y, 182, 12);
      if (selectedOrder) {
        pdf.text(`Concrete ${selectedOrder.grade}`, 16, y + 8);
        pdf.text(`${selectedOrder.quantity} m3`, 110, y + 8);
        pdf.text(formatCurrency(ratePerCubicMeter), 135, y + 8);
        pdf.text(formatCurrency(subtotal), 165, y + 8);
      } else {
        pdf.text(`Raw Material ${selectedRawOrder!.materialName}`, 16, y + 8);
        pdf.text(`${selectedRawOrder!.quantity} ${selectedRawOrder!.unit}`, 110, y + 8);
        pdf.text(formatCurrency(rawRatePerUnit), 135, y + 8);
        pdf.text(formatCurrency(subtotal), 165, y + 8);
      }
      y += 18;

      pdf.text(`Subtotal: ${formatCurrency(subtotal)}`, 132, y);
      y += 7;
      pdf.text(`GST (${GST_RATE}%): ${formatCurrency(gstAmount)}`, 132, y);
      y += 7;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text(`Total: ${formatCurrency(totalPayable)}`, 132, y);
      y += 8;
      pdf.text(`Payment Status: ${paymentStatus.replaceAll("_", " ")}`, 132, y);

      pdf.save(`Invoice_${invoiceRef}.pdf`);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-7xl mx-auto px-6 pt-28 pb-10 space-y-6">
        <section className="rounded-3xl overflow-hidden shadow-xl border border-slate-700">
          <div className="bg-[linear-gradient(110deg,#111827_0%,#1f2937_50%,#374151_100%)] text-white p-8">
            <h1 className="text-3xl mt-2 font-semibold [font-family:'Georgia',serif]">Billing and Invoice</h1>
            <p className="text-slate-200 mt-2 text-sm">Invoice view for your selected order.</p>
          </div>
        </section>

        {message && (
          <section className="bg-white rounded-2xl shadow-md p-4 border border-emerald-200 text-emerald-700 text-sm">
            {message}
            <button onClick={() => setMessage("")} className="ml-3 font-semibold">Dismiss</button>
          </section>
        )}

        <section className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
          <label className="block text-sm font-medium text-slate-700 mb-2">Order Invoice</label>
          {loading ? (
            <p className="text-sm text-slate-500">Loading invoice...</p>
          ) : orders.length === 0 && rawOrders.length === 0 ? (
            <p className="text-sm text-slate-500">No invoice order found.</p>
          ) : lockedOrderId || lockedRawOrderId > 0 ? (
            <div className="px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 text-sm">
              {selectedOrderId.startsWith("RAW:")
                ? `RMO-${selectedOrderId.replace("RAW:", "")}`
                : selectedOrderId || (lockedRawOrderId > 0 ? `RMO-${lockedRawOrderId}` : "")}
            </div>
          ) : (
            <select value={selectedOrderId} onChange={(e) => setSelectedOrderId(e.target.value)} className="w-full md:w-[440px] px-4 py-3 border border-slate-300 rounded-xl">
              {orders.map((o) => (
                <option key={`concrete-${o.id}`} value={o.orderId}>{o.orderId} - {o.grade} (Concrete)</option>
              ))}
              {rawOrders.map((o) => (
                <option key={`raw-${o.id}`} value={`RAW:${o.id}`}>
                  RMO-{o.id} - {o.materialName} (Raw Material)
                </option>
              ))}
            </select>
          )}
        </section>

        {(selectedOrder || selectedRawOrder) && (
          <>
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
                <p className="text-xs uppercase tracking-wide text-slate-500">Invoice Total</p>
                <p className="text-2xl font-bold text-slate-800 mt-2">{formatCurrency(totalPayable)}</p>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
                <p className="text-xs uppercase tracking-wide text-slate-500">Amount Paid</p>
                <p className="text-2xl font-bold text-emerald-600 mt-2">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
                <p className="text-xs uppercase tracking-wide text-slate-500">Balance</p>
                <p className="text-2xl font-bold text-rose-600 mt-2">{formatCurrency(outstanding)}</p>
              </div>
            </section>

            <section className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h2 className="font-semibold text-slate-800">Invoice Preview</h2>
                <button onClick={handleDownloadPdf} disabled={downloadingPdf} className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium">
                  {downloadingPdf ? "Preparing PDF..." : "Download Invoice PDF"}
                </button>
              </div>
              <div className="p-7">
                {selectedOrder ? (
                  <>
                    <p className="text-sm"><strong>Invoice:</strong> INV-{selectedOrder.orderId}</p>
                    <p className="text-sm"><strong>Order:</strong> {selectedOrder.orderId}</p>
                    <p className="text-sm"><strong>Grade:</strong> {selectedOrder.grade}</p>
                    <p className="text-sm"><strong>Quantity:</strong> {selectedOrder.quantity} m3</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm"><strong>Invoice:</strong> INV-RMO-{selectedRawOrder!.id}</p>
                    <p className="text-sm"><strong>Order:</strong> RMO-{selectedRawOrder!.id}</p>
                    <p className="text-sm"><strong>Material:</strong> {selectedRawOrder!.materialName}</p>
                    <p className="text-sm"><strong>Quantity:</strong> {selectedRawOrder!.quantity} {selectedRawOrder!.unit}</p>
                    <p className="text-sm"><strong>Rate:</strong> Rs.{selectedRawOrder!.pricePerUnit} / {selectedRawOrder!.unit}</p>
                    <p className="text-sm"><strong>Subtotal:</strong> {formatCurrency(subtotal)}</p>
                    <p className="text-sm"><strong>Order Status:</strong> {selectedRawOrder!.status.replaceAll("_", " ")}</p>
                  </>
                )}
                <p className="text-sm"><strong>Customer:</strong> {customerName}</p>
                <p className="text-sm"><strong>Email:</strong> {customerEmail}</p>
                <p className="text-sm"><strong>Phone:</strong> {customerPhone}</p>
                <p className="text-sm"><strong>Address:</strong> {selectedRawOrder?.address || customerAddress}</p>
                <p className="text-sm mt-2"><strong>Payment Method:</strong> {paymentMethodLabel}</p>
                <p className="text-sm mt-2"><strong>Payment Status:</strong> {paymentStatus.replaceAll("_", " ")}</p>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default BillingPayment;
