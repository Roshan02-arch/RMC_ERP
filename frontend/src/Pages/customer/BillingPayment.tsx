import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  orderId: string;
  amount: number;
  method: string;
  paidAt: string;
  transactionId: string;
};

const RATE_MAP: Record<string, number> = {
  M20: 5000,
  M25: 5500,
  M30: 6000,
  M35: 6500,
};

const GST_RATE = 18;
const STORAGE_KEY = "rmc_payment_history_v1";

const formatCurrency = (value: number) =>
  `Rs.${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusClass = (status: string) => {
  if (status === "PAID") return "bg-slate-100 text-slate-700 border-slate-300";
  if (status === "PARTIALLY_PAID") return "bg-zinc-100 text-zinc-700 border-zinc-300";
  return "bg-gray-100 text-gray-700 border-gray-300";
};

const BillingPayment = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [method, setMethod] = useState("UPI");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

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
        const res = await fetch(`http://localhost:8080/api/orders/my-orders/${userId}`);
        const data = await res.json();
        const items = Array.isArray(data) ? data : [];
        items.sort((a: Order, b: Order) => b.id - a.id);
        setOrders(items);
        if (items.length > 0) {
          setSelectedOrderId(items[0].orderId);
        }
      } catch (error) {
        console.error("Failed to load billing data", error);
      } finally {
        setLoading(false);
      }
    };

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setPaymentHistory(JSON.parse(saved));
      } catch {
        setPaymentHistory([]);
      }
    }

    void load();
  }, [navigate]);

  const selectedOrder = useMemo(
    () => orders.find((o) => o.orderId === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  const ratePerCubicMeter = selectedOrder ? RATE_MAP[selectedOrder.grade] || 0 : 0;
  const subtotal = selectedOrder
    ? selectedOrder.totalPrice && selectedOrder.totalPrice > 0
      ? selectedOrder.totalPrice
      : ratePerCubicMeter * selectedOrder.quantity
    : 0;
  const gstAmount = (subtotal * GST_RATE) / 100;
  const totalPayable = subtotal + gstAmount;

  const selectedOrderPayments = useMemo(
    () => paymentHistory.filter((p) => p.orderId === selectedOrderId),
    [paymentHistory, selectedOrderId]
  );
  const totalPaid = selectedOrderPayments.reduce((sum, p) => sum + p.amount, 0);
  const outstanding = Math.max(0, totalPayable - totalPaid);
  const paymentStatus = outstanding === 0 ? "PAID" : totalPaid > 0 ? "PARTIALLY_PAID" : "PENDING";

  const dueDate = useMemo(() => {
    if (!selectedOrder) return "-";
    const base = selectedOrder.expectedArrivalTime || selectedOrder.deliveryDate || new Date().toISOString();
    const d = new Date(base);
    d.setDate(d.getDate() + 7);
    return d.toLocaleDateString();
  }, [selectedOrder]);

  useEffect(() => {
    if (outstanding > 0) {
      setAmount(String(outstanding.toFixed(2)));
    } else {
      setAmount("");
    }
  }, [selectedOrderId, outstanding]);

  const persistHistory = (next: PaymentRecord[]) => {
    setPaymentHistory(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const handlePay = () => {
    if (!selectedOrder) {
      alert("Please select an order.");
      return;
    }
    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      alert("Enter a valid amount.");
      return;
    }
    if (payAmount > outstanding) {
      alert("Amount exceeds outstanding balance.");
      return;
    }

    const record: PaymentRecord = {
      orderId: selectedOrder.orderId,
      amount: Number(payAmount.toFixed(2)),
      method,
      paidAt: new Date().toISOString(),
      transactionId: `TXN-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    };

    persistHistory([record, ...paymentHistory]);
    alert("Payment recorded successfully.");
  };

  const handleDownloadPdf = () => {
    if (!selectedOrder) {
      alert("Please select an order first.");
      return;
    }

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
      pdf.text(`Invoice No: INV-${selectedOrder.orderId}`, 14, y);
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, 140, y);
      y += 8;
      pdf.text(`Order ID: ${selectedOrder.orderId}`, 14, y);
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
      pdf.text(`Concrete ${selectedOrder.grade}`, 16, y + 8);
      pdf.text(`${selectedOrder.quantity} m3`, 110, y + 8);
      pdf.text(formatCurrency(ratePerCubicMeter), 135, y + 8);
      pdf.text(formatCurrency(subtotal), 165, y + 8);
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

      y += 14;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text("This is a computer-generated invoice.", 14, y);
      y += 14;
      pdf.setDrawColor(120, 120, 120);
      pdf.line(14, y, 82, y);
      pdf.line(120, y, 188, y);

      pdf.save(`Invoice_${selectedOrder.orderId}.pdf`);
    } catch (error) {
      console.error("Invoice PDF generation failed", error);
      alert("Unable to download invoice PDF. Please try again.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,#f3f4f6_0%,#ffffff_45%,#e5e7eb_100%)]">
      <main className="max-w-7xl mx-auto px-6 pt-28 pb-10 space-y-6">
        <section className="rounded-3xl overflow-hidden shadow-xl border border-slate-700">
          <div className="bg-[linear-gradient(110deg,#111827_0%,#1f2937_50%,#374151_100%)] text-white p-8">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-300">RMC ERP FINANCE</p>
            <h1 className="text-3xl mt-2 font-semibold [font-family:'Georgia',serif]">Billing and Invoice Desk</h1>
            <p className="text-slate-200 mt-2 text-sm">
              Professional invoice management, payment capture, and downloadable tax invoice.
            </p>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
          <label className="block text-sm font-medium text-slate-700 mb-2">Select Order for Billing</label>
          {loading ? (
            <p className="text-sm text-slate-500">Loading order invoices...</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-slate-500">No orders available for billing.</p>
          ) : (
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="w-full md:w-[440px] px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {orders.map((o) => (
                <option key={o.id} value={o.orderId}>
                  {o.orderId} - {o.grade} - {o.status}
                </option>
              ))}
            </select>
          )}
        </section>

        {selectedOrder && (
          <>
            <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
                <p className="text-xs uppercase tracking-wide text-slate-500">Invoice Total</p>
                <p className="text-2xl font-bold text-slate-800 mt-2">{formatCurrency(totalPayable)}</p>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
                <p className="text-xs uppercase tracking-wide text-slate-500">Amount Paid</p>
                <p className="text-2xl font-bold text-emerald-600 mt-2">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
                <p className="text-xs uppercase tracking-wide text-slate-500">Balance Due</p>
                <p className={`text-2xl font-bold mt-2 ${outstanding === 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {formatCurrency(outstanding)}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
                <p className="text-xs uppercase tracking-wide text-slate-500">Payment Due Date</p>
                <p className="text-2xl font-bold text-slate-800 mt-2">{dueDate}</p>
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <div>
                    <h2 className="font-semibold text-slate-800">Invoice Preview</h2>
                    <p className="text-xs text-slate-500 mt-1">Tax Invoice Format - Customer Copy</p>
                  </div>
                  <button
                    onClick={handleDownloadPdf}
                    disabled={downloadingPdf}
                    className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-60 text-white text-sm font-medium transition"
                  >
                    {downloadingPdf ? "Preparing PDF..." : "Download Invoice PDF"}
                  </button>
                </div>

                <div className="p-7 bg-white relative overflow-hidden">
                  <div className="absolute right-6 top-6 rotate-12 border-2 border-slate-300 text-slate-600 px-3 py-1 text-xs font-bold rounded">
                    {paymentStatus.replaceAll("_", " ")}
                  </div>

                  <div className="flex justify-between items-start pb-5 border-b border-slate-200">
                    <div>
                      <p className="text-3xl leading-none [font-family:'Georgia',serif] text-slate-900">RMC ERP</p>
                      <p className="text-sm text-slate-500 mt-2">Ready Mix Concrete Billing Division</p>
                      <p className="text-xs text-slate-400 mt-1">GST INVOICE</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Invoice No</p>
                      <p className="font-semibold text-slate-800">INV-{selectedOrder.orderId}</p>
                      <p className="text-xs text-slate-500 mt-2">Issue Date: {new Date().toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 text-sm">
                    <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/60">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Billed To</p>
                      <p className="font-semibold text-slate-800 mt-1">{customerName}</p>
                      <p className="text-slate-600">{customerEmail}</p>
                      <p className="text-slate-600">{customerPhone}</p>
                      <p className="text-slate-600">{customerAddress}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/60">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Order Information</p>
                      <p className="text-slate-700 mt-1"><span className="font-semibold">Order ID:</span> {selectedOrder.orderId}</p>
                      <p className="text-slate-700"><span className="font-semibold">Concrete Grade:</span> {selectedOrder.grade}</p>
                      <p className="text-slate-700"><span className="font-semibold">Order Status:</span> {selectedOrder.status}</p>
                      <p className="text-slate-700">
                        <span className="font-semibold">Delivery:</span>{" "}
                        {selectedOrder.deliveryDate ? new Date(selectedOrder.deliveryDate).toLocaleString() : "-"}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-800 text-slate-100">
                        <tr>
                          <th className="text-left px-4 py-3">Description</th>
                          <th className="text-left px-4 py-3">Qty</th>
                          <th className="text-left px-4 py-3">Rate</th>
                          <th className="text-left px-4 py-3">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-slate-100">
                          <td className="px-4 py-3">Concrete {selectedOrder.grade}</td>
                          <td className="px-4 py-3">{selectedOrder.quantity} m3</td>
                          <td className="px-4 py-3">{formatCurrency(ratePerCubicMeter)}</td>
                          <td className="px-4 py-3">{formatCurrency(subtotal)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-5 ml-auto w-full md:w-[360px] rounded-xl border border-slate-200 p-4 bg-slate-50">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Subtotal</span>
                        <span className="font-medium text-slate-800">{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">GST ({GST_RATE}%)</span>
                        <span className="font-medium text-slate-800">{formatCurrency(gstAmount)}</span>
                      </div>
                      <div className="border-t border-slate-200 pt-2 flex justify-between">
                        <span className="font-semibold text-slate-700">Grand Total</span>
                        <span className="font-bold text-slate-900">{formatCurrency(totalPayable)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <div className="h-10 border-b border-slate-400" />
                    </div>
                    <div>
                      <div className="h-10 border-b border-slate-400" />
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mt-4">
                    This is a computer-generated tax invoice and does not require a physical signature.
                  </p>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
                  <h2 className="font-semibold text-slate-800 mb-4">Payment Collection</h2>
                  <div className="space-y-3">
                    <div className={`inline-flex px-3 py-1 text-xs rounded-full border font-semibold ${statusClass(paymentStatus)}`}>
                      {paymentStatus.replaceAll("_", " ")}
                    </div>
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                      <option value="UPI">UPI</option>
                      <option value="ONLINE_TRANSFER">Online Transfer</option>
                      <option value="BANK_PAYMENT">Bank Payment</option>
                    </select>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400"
                    />
                    <button
                      onClick={handlePay}
                      disabled={outstanding === 0}
                      className="w-full px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium transition"
                    >
                      {outstanding === 0 ? "Already Settled" : "Record Payment"}
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
                  <h2 className="font-semibold text-slate-800 mb-4">Invoice Metadata</h2>
                  <div className="space-y-2 text-sm text-slate-700">
                    <p><span className="font-semibold">Order ID:</span> {selectedOrder.orderId}</p>
                    <p><span className="font-semibold">Grade:</span> {selectedOrder.grade}</p>
                    <p><span className="font-semibold">Quantity:</span> {selectedOrder.quantity} m3</p>
                    <p><span className="font-semibold">Address:</span> {selectedOrder.address || "-"}</p>
                    <p><span className="font-semibold">Expected Arrival:</span> {selectedOrder.expectedArrivalTime ? new Date(selectedOrder.expectedArrivalTime).toLocaleString() : "-"}</p>
                    <p><span className="font-semibold">Due Date:</span> {dueDate}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
              <h2 className="font-semibold text-slate-800 mb-4">Payment History</h2>
              {selectedOrderPayments.length === 0 ? (
                <p className="text-sm text-slate-500">No payment records yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 uppercase text-xs">
                        <th className="px-4 py-3 text-left">Txn ID</th>
                        <th className="px-4 py-3 text-left">Method</th>
                        <th className="px-4 py-3 text-left">Amount</th>
                        <th className="px-4 py-3 text-left">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedOrderPayments.map((p) => (
                        <tr key={p.transactionId}>
                          <td className="px-4 py-3">{p.transactionId}</td>
                          <td className="px-4 py-3">{p.method}</td>
                          <td className="px-4 py-3">{formatCurrency(p.amount)}</td>
                          <td className="px-4 py-3">{new Date(p.paidAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default BillingPayment;
