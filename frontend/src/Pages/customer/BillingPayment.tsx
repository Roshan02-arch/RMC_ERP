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
  paymentOption?: string;
  creditDays?: number;
  creditApprovalStatus?: string;
  creditDueDate?: string;
  creditReviewRemark?: string;
};

type PaymentRecord = {
  id?: number;
  orderId: string;
  amount: number;
  method: string;
  paidAt: string;
  transactionId: string;
};

type PaymentStatus = "PENDING" | "PARTIALLY_PAID" | "PAYMENT_COMPLETED";

type ConcretePaymentSummary = {
  totalPaid: number;
  outstanding: number;
  totalPayable: number;
  status: PaymentStatus;
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
const normalizeStatus = (value: string) => value.trim().toUpperCase();
const isRawPaymentCompleted = (status: string) => {
  const normalized = normalizeStatus(status || "");
  return (
    normalized === "PAID" ||
    normalized === "PAYMENT_COMPLETED" ||
    normalized === "COMPLETED" ||
    normalized === "FULLY_PAID"
  );
};

const getConcreteSubtotal = (order: Order) => {
  const ratePerCubicMeter = RATE_MAP[order.grade] || 0;
  if (order.totalPrice && order.totalPrice > 0) {
    return order.totalPrice;
  }
  return ratePerCubicMeter * order.quantity;
};

const getConcretePaymentSummary = (order: Order, payments: PaymentRecord[]): ConcretePaymentSummary => {
  const subtotal = getConcreteSubtotal(order);
  const gstAmount = (subtotal * GST_RATE) / 100;
  const totalPayable = subtotal + gstAmount;
  const totalPaid = payments
    .filter((p) => !isCodPayment(p.method))
    .reduce((sum, payment) => sum + payment.amount, 0);
  const fullyPaid = totalPaid >= totalPayable || totalPaid >= subtotal;
  const outstanding = fullyPaid ? 0 : Math.max(0, totalPayable - totalPaid);
  const status: PaymentStatus = fullyPaid
    ? "PAYMENT_COMPLETED"
    : totalPaid > 0
    ? "PARTIALLY_PAID"
    : "PENDING";

  return { totalPaid, outstanding, totalPayable, status };
};

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
  const [paymentHistoryByOrderId, setPaymentHistoryByOrderId] = useState<Record<string, PaymentRecord[]>>({});
  const [loadingPayments, setLoadingPayments] = useState(false);
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
      } catch (error) {
        console.error("Failed to load billing data", error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [navigate, lockedOrderId, lockedRawOrderId]);

  useEffect(() => {
    const fetchAllOrderPayments = async () => {
      if (orders.length === 0) {
        setPaymentHistoryByOrderId({});
        return;
      }

      try {
        setLoadingPayments(true);
        const entries = await Promise.all(
          orders.map(async (order) => {
            try {
              const response = await fetch(`http://localhost:8080/api/orders/${order.orderId}/payments`);
              if (!response.ok) {
                return [order.orderId, []] as const;
              }
              const data: PaymentRecord[] = await response.json();
              return [order.orderId, Array.isArray(data) ? data : []] as const;
            } catch {
              return [order.orderId, []] as const;
            }
          })
        );

        setPaymentHistoryByOrderId(Object.fromEntries(entries));
      } finally {
        setLoadingPayments(false);
      }
    };

    void fetchAllOrderPayments();
  }, [orders]);

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

  const concreteSummaryByOrderId = useMemo(
    () =>
      Object.fromEntries(
        orders.map((order) => [
          order.orderId,
          getConcretePaymentSummary(order, paymentHistoryByOrderId[order.orderId] || []),
        ])
      ) as Record<string, ConcretePaymentSummary>,
    [orders, paymentHistoryByOrderId]
  );

  const pendingConcreteOrders = useMemo(
    () =>
      orders.filter(
        (order) => concreteSummaryByOrderId[order.orderId]?.status !== "PAYMENT_COMPLETED"
      ),
    [orders, concreteSummaryByOrderId]
  );
  const completedConcreteOrders = useMemo(
    () =>
      orders.filter(
        (order) => concreteSummaryByOrderId[order.orderId]?.status === "PAYMENT_COMPLETED"
      ),
    [orders, concreteSummaryByOrderId]
  );

  const pendingRawOrders = useMemo(
    () => rawOrders.filter((order) => !isRawPaymentCompleted(order.status)),
    [rawOrders]
  );
  const completedRawOrders = useMemo(
    () => rawOrders.filter((order) => isRawPaymentCompleted(order.status)),
    [rawOrders]
  );
  const hasLockedPendingSelection =
    (Boolean(lockedOrderId) &&
      pendingConcreteOrders.some((order) => order.orderId === lockedOrderId)) ||
    (lockedRawOrderId > 0 && pendingRawOrders.some((order) => order.id === lockedRawOrderId));

  useEffect(() => {
    const preferredLockedSelection =
      lockedOrderId && pendingConcreteOrders.some((order) => order.orderId === lockedOrderId)
        ? lockedOrderId
        : lockedRawOrderId > 0 &&
          pendingRawOrders.some((order) => order.id === lockedRawOrderId)
        ? `RAW:${lockedRawOrderId}`
        : "";

    const isCurrentValid =
      pendingConcreteOrders.some((order) => order.orderId === selectedOrderId) ||
      pendingRawOrders.some((order) => `RAW:${order.id}` === selectedOrderId);

    if (preferredLockedSelection) {
      if (selectedOrderId !== preferredLockedSelection) {
        setSelectedOrderId(preferredLockedSelection);
      }
      return;
    }

    if (isCurrentValid) {
      return;
    }

    if (pendingConcreteOrders.length > 0) {
      setSelectedOrderId(pendingConcreteOrders[0].orderId);
      return;
    }
    if (pendingRawOrders.length > 0) {
      setSelectedOrderId(`RAW:${pendingRawOrders[0].id}`);
      return;
    }
    setSelectedOrderId("");
  }, [
    lockedOrderId,
    lockedRawOrderId,
    pendingConcreteOrders,
    pendingRawOrders,
    selectedOrderId,
  ]);

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
  const selectedConcreteSummary = selectedOrder
    ? concreteSummaryByOrderId[selectedOrder.orderId] || getConcretePaymentSummary(selectedOrder, [])
    : null;
  const totalPaid = selectedConcreteSummary?.totalPaid || 0;
  const outstanding = selectedConcreteSummary?.outstanding || Math.max(0, totalPayable);
  const paymentStatus: PaymentStatus = selectedOrder
    ? selectedConcreteSummary?.status || "PENDING"
    : selectedRawOrder && isRawPaymentCompleted(selectedRawOrder.status)
    ? "PAYMENT_COMPLETED"
    : "PENDING";

  const downloadInvoicePdf = ({
    concreteOrder,
    rawOrder,
    paymentStatusOverride,
  }: {
    concreteOrder?: Order | null;
    rawOrder?: RawMaterialOrder | null;
    paymentStatusOverride?: PaymentStatus;
  }) => {
    const targetOrder = concreteOrder || selectedOrder;
    const targetRawOrder = rawOrder || selectedRawOrder;
    if (!targetOrder && !targetRawOrder) return;

    const targetRatePerUnit = targetOrder
      ? RATE_MAP[targetOrder.grade] || 0
      : Number(targetRawOrder?.pricePerUnit || 0);
    const targetSubtotal = targetOrder
      ? getConcreteSubtotal(targetOrder)
      : targetRawOrder
      ? targetRawOrder.totalPrice && targetRawOrder.totalPrice > 0
        ? targetRawOrder.totalPrice
        : targetRatePerUnit * targetRawOrder.quantity
      : 0;
    const targetGstAmount = (targetSubtotal * GST_RATE) / 100;
    const targetTotalPayable = targetSubtotal + targetGstAmount;
    const targetConcreteSummary = targetOrder
      ? concreteSummaryByOrderId[targetOrder.orderId] ||
        getConcretePaymentSummary(targetOrder, paymentHistoryByOrderId[targetOrder.orderId] || [])
      : null;
    const targetPaymentStatus: PaymentStatus = paymentStatusOverride
      ? paymentStatusOverride
      : targetOrder
      ? targetConcreteSummary?.status || "PENDING"
      : targetRawOrder && isRawPaymentCompleted(targetRawOrder.status)
      ? "PAYMENT_COMPLETED"
      : "PENDING";

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
      const invoiceRef = targetOrder ? targetOrder.orderId : `RMO-${targetRawOrder!.id}`;
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
      if (targetOrder) {
        pdf.text(`Concrete ${targetOrder.grade}`, 16, y + 8);
        pdf.text(`${targetOrder.quantity} m3`, 110, y + 8);
        pdf.text(formatCurrency(targetRatePerUnit), 135, y + 8);
        pdf.text(formatCurrency(targetSubtotal), 165, y + 8);
      } else {
        pdf.text(`Raw Material ${targetRawOrder!.materialName}`, 16, y + 8);
        pdf.text(`${targetRawOrder!.quantity} ${targetRawOrder!.unit}`, 110, y + 8);
        pdf.text(formatCurrency(targetRatePerUnit), 135, y + 8);
        pdf.text(formatCurrency(targetSubtotal), 165, y + 8);
      }
      y += 18;

      pdf.text(`Subtotal: ${formatCurrency(targetSubtotal)}`, 132, y);
      y += 7;
      pdf.text(`GST (${GST_RATE}%): ${formatCurrency(targetGstAmount)}`, 132, y);
      y += 7;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text(`Total: ${formatCurrency(targetTotalPayable)}`, 132, y);
      y += 8;
      pdf.text(`Payment Status: ${targetPaymentStatus.replaceAll("_", " ")}`, 132, y);

      pdf.save(`Invoice_${invoiceRef}.pdf`);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadPdf = () => {
    void downloadInvoicePdf({
      concreteOrder: selectedOrder,
      rawOrder: selectedRawOrder,
    });
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
          ) : loadingPayments ? (
            <p className="text-sm text-slate-500">Loading payment status...</p>
          ) : pendingConcreteOrders.length === 0 && pendingRawOrders.length === 0 ? (
            <p className="text-sm text-slate-500">
              No pending payment orders in billing. Completed payments are available in Order History.
            </p>
          ) : hasLockedPendingSelection ? (
            <div className="px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 text-sm">
              {selectedOrderId.startsWith("RAW:")
                ? `RMO-${selectedOrderId.replace("RAW:", "")}`
                : selectedOrderId || (lockedRawOrderId > 0 ? `RMO-${lockedRawOrderId}` : "")}
            </div>
          ) : (
            <select value={selectedOrderId} onChange={(e) => setSelectedOrderId(e.target.value)} className="w-full md:w-[440px] px-4 py-3 border border-slate-300 rounded-xl">
              {pendingConcreteOrders.map((o) => (
                <option key={`concrete-${o.id}`} value={o.orderId}>{o.orderId} - {o.grade} (Concrete)</option>
              ))}
              {pendingRawOrders.map((o) => (
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
                <p className="text-sm mt-2"><strong>Payment Status:</strong> {paymentStatus.replaceAll("_", " ")}</p>
                {selectedOrder && String(selectedOrder.paymentOption || "").toUpperCase() === "PAY_LATER" && (
                  <>
                    <p className="text-sm"><strong>Payment Option:</strong> Pay Later</p>
                    <p className="text-sm"><strong>Credit Status:</strong> {(selectedOrder.creditApprovalStatus || "PENDING").replaceAll("_", " ")}</p>
                    <p className="text-sm"><strong>Credit Due Date:</strong> {selectedOrder.creditDueDate || "-"}</p>
                    <p className="text-sm"><strong>Admin Remark:</strong> {selectedOrder.creditReviewRemark || "-"}</p>
                  </>
                )}
                {selectedOrder && String(selectedOrder.creditApprovalStatus || "").toUpperCase() === "REJECTED" && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    Admin rejected this credit request. Complete payment to continue this order.
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        <section className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-semibold text-slate-800">Order History (Payment Completed)</h2>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
              {completedConcreteOrders.length + completedRawOrders.length} completed
            </span>
          </div>

          {loadingPayments ? (
            <p className="text-sm text-slate-500 mt-4">Loading completed payment history...</p>
          ) : completedConcreteOrders.length === 0 && completedRawOrders.length === 0 ? (
            <p className="text-sm text-slate-500 mt-4">No completed payment orders yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {completedConcreteOrders.map((order) => {
                const summary = concreteSummaryByOrderId[order.orderId];
                return (
                  <div key={`history-concrete-${order.id}`} className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm font-semibold text-slate-800">{order.orderId} - {order.grade} (Concrete)</p>
                    <p className="text-sm text-slate-600">Quantity: {order.quantity} m3</p>
                    <p className="text-sm text-slate-600">Invoice Total: {formatCurrency(summary?.totalPayable || 0)}</p>
                    <p className="text-sm text-emerald-700 font-semibold">Payment Status: PAYMENT COMPLETED</p>
                    <button
                      type="button"
                      onClick={() =>
                        downloadInvoicePdf({
                          concreteOrder: order,
                          paymentStatusOverride: "PAYMENT_COMPLETED",
                        })
                      }
                      disabled={downloadingPdf}
                      className="mt-3 px-3 py-2 rounded-lg bg-slate-700 text-white text-xs font-medium disabled:opacity-60"
                    >
                      {downloadingPdf ? "Preparing PDF..." : "Download Invoice PDF"}
                    </button>
                  </div>
                );
              })}

              {completedRawOrders.map((order) => (
                <div key={`history-raw-${order.id}`} className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-slate-800">RMO-{order.id} - {order.materialName} (Raw Material)</p>
                  <p className="text-sm text-slate-600">Quantity: {order.quantity} {order.unit}</p>
                  <p className="text-sm text-slate-600">Invoice Total: {formatCurrency(order.totalPrice || 0)}</p>
                  <p className="text-sm text-emerald-700 font-semibold">Payment Status: PAYMENT COMPLETED</p>
                  <button
                    type="button"
                    onClick={() =>
                      downloadInvoicePdf({
                        rawOrder: order,
                        paymentStatusOverride: "PAYMENT_COMPLETED",
                      })
                    }
                    disabled={downloadingPdf}
                    className="mt-3 px-3 py-2 rounded-lg bg-slate-700 text-white text-xs font-medium disabled:opacity-60"
                  >
                    {downloadingPdf ? "Preparing PDF..." : "Download Invoice PDF"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default BillingPayment;
