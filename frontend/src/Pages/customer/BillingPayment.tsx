import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

const BillingPayment = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [method, setMethod] = useState("UPI");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);

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
        const delivered = items.filter((o) => o.status === "DELIVERED");
        setOrders(delivered);
        if (delivered.length > 0) {
          setSelectedOrderId(delivered[0].orderId);
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
      alert("Please select an invoice.");
      return;
    }
    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      alert("Enter valid payment amount.");
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
    alert("Payment successful. Status updated.");
  };

  const handleDownloadPdf = () => {
    if (!selectedOrder) return;
    const html = `
      <html>
      <head><title>Invoice ${selectedOrder.orderId}</title></head>
      <body style="font-family: Arial, sans-serif; padding: 24px;">
        <h2>RMC Invoice</h2>
        <p><strong>Invoice No:</strong> INV-${selectedOrder.orderId}</p>
        <p><strong>Order ID:</strong> ${selectedOrder.orderId}</p>
        <p><strong>Grade:</strong> ${selectedOrder.grade}</p>
        <p><strong>Quantity Delivered:</strong> ${selectedOrder.quantity} m3</p>
        <p><strong>Rate per Cubic Meter:</strong> Rs.${ratePerCubicMeter.toFixed(2)}</p>
        <p><strong>Subtotal:</strong> Rs.${subtotal.toFixed(2)}</p>
        <p><strong>GST (${GST_RATE}%):</strong> Rs.${gstAmount.toFixed(2)}</p>
        <p><strong>Total Amount:</strong> Rs.${totalPayable.toFixed(2)}</p>
        <p><strong>Status:</strong> ${paymentStatus}</p>
      </body>
      </html>
    `;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-6xl mx-auto px-6 pt-28 pb-10 space-y-6">
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800">Billing & Payment</h1>
          <p className="text-sm text-gray-500 mt-1">
            Invoice generation, payment tracking and outstanding balance management.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Delivered Order</label>
          {loading ? (
            <p className="text-sm text-gray-500">Loading invoices...</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-gray-500">No delivered orders available for billing yet.</p>
          ) : (
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-md"
            >
              {orders.map((o) => (
                <option key={o.id} value={o.orderId}>
                  {o.orderId}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedOrder && (
          <>
            <div className="bg-white rounded-2xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Invoice Generation (Read-Only)</h2>
                <button onClick={handleDownloadPdf} className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm">
                  Download PDF
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
                <p><span className="font-semibold">Invoice No:</span> INV-{selectedOrder.orderId}</p>
                <p><span className="font-semibold">Order ID:</span> {selectedOrder.orderId}</p>
                <p><span className="font-semibold">Concrete Grade:</span> {selectedOrder.grade}</p>
                <p><span className="font-semibold">Quantity Delivered:</span> {selectedOrder.quantity} m3</p>
                <p><span className="font-semibold">Rate per Cubic Meter:</span> Rs.{ratePerCubicMeter.toFixed(2)}</p>
                <p><span className="font-semibold">Subtotal:</span> Rs.{subtotal.toFixed(2)}</p>
                <p><span className="font-semibold">Applicable Tax (GST {GST_RATE}%):</span> Rs.{gstAmount.toFixed(2)}</p>
                <p><span className="font-semibold">Total Amount:</span> Rs.{totalPayable.toFixed(2)}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Payment Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-gray-500">Total Payable</p>
                  <p className="text-lg font-semibold text-gray-800">Rs.{totalPayable.toFixed(2)}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-gray-500">Payment Due Date</p>
                  <p className="text-lg font-semibold text-gray-800">{dueDate}</p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-gray-500">Payment Status</p>
                  <p className={`text-lg font-semibold ${paymentStatus === "PAID" ? "text-green-600" : "text-amber-600"}`}>
                    {paymentStatus}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Payment Process</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="UPI">UPI</option>
                  <option value="ONLINE_TRANSFER">Online Transfer</option>
                  <option value="BANK_PAYMENT">Bank Payment</option>
                </select>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount"
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
                <button
                  onClick={handlePay}
                  disabled={outstanding === 0}
                  className="px-4 py-2 rounded-md bg-emerald-600 text-white disabled:opacity-50"
                >
                  {outstanding === 0 ? "Already Paid" : "Pay Now"}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Outstanding Balance Tracking</h2>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Outstanding Amount:</span>{" "}
                <span className={outstanding === 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                  Rs.{outstanding.toFixed(2)}
                </span>
              </p>
              {outstanding > 0 ? (
                <p className="text-sm text-amber-700 mt-2">
                  Reminder: Payment is pending. Please complete to close this transaction.
                </p>
              ) : (
                <p className="text-sm text-green-700 mt-2">
                  Payment completed successfully. Transaction is closed.
                </p>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Previous Payment History</h2>
              {selectedOrderPayments.length === 0 ? (
                <p className="text-sm text-gray-500">No payment records yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600 uppercase text-xs">
                        <th className="px-4 py-3 text-left">Txn ID</th>
                        <th className="px-4 py-3 text-left">Method</th>
                        <th className="px-4 py-3 text-left">Amount</th>
                        <th className="px-4 py-3 text-left">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedOrderPayments.map((p) => (
                        <tr key={p.transactionId}>
                          <td className="px-4 py-3">{p.transactionId}</td>
                          <td className="px-4 py-3">{p.method}</td>
                          <td className="px-4 py-3">Rs.{p.amount.toFixed(2)}</td>
                          <td className="px-4 py-3">{new Date(p.paidAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default BillingPayment;
