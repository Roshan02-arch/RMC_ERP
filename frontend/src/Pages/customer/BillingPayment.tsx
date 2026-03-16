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
const COMPANY_NAME = "RMC ERP Pvt. Ltd.";
const COMPANY_EMAIL = "billing@rmcerp.com";
const COMPANY_PHONE = "+91 98765 43210";
const COMPANY_ADDRESS = "Industrial Area, Hyderabad, Telangana";
const formatCurrency = (value: number) =>
  `Rs.${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDateLabel = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};
const formatStatusLabel = (value?: string) => (value ? value.replaceAll("_", " ") : "-");
const getStatusPillClass = (status: PaymentStatus) => {
  if (status === "PAYMENT_COMPLETED") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "PARTIALLY_PAID") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-rose-100 text-rose-700 border-rose-200";
};
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
  const invoiceRef = selectedOrder ? selectedOrder.orderId : selectedRawOrder ? `RMO-${selectedRawOrder.id}` : "-";
  const invoiceNumber = `INV-${invoiceRef}`;
  const invoiceIssueDate = formatDateLabel(new Date().toISOString());
  const invoiceDeliveryDate = formatDateLabel(selectedOrder?.deliveryDate || selectedRawOrder?.createdAt);
  const invoiceItemDescription = selectedOrder
    ? `Concrete ${selectedOrder.grade}`
    : selectedRawOrder
    ? `Raw Material ${selectedRawOrder.materialName}`
    : "-";
  const invoiceItemQuantity = selectedOrder
    ? `${selectedOrder.quantity} m3`
    : selectedRawOrder
    ? `${selectedRawOrder.quantity} ${selectedRawOrder.unit}`
    : "-";
  const invoiceRate = selectedOrder ? ratePerCubicMeter : Number(selectedRawOrder?.pricePerUnit || 0);
  const paymentDueDate =
    selectedOrder && String(selectedOrder.paymentOption || "").toUpperCase() === "PAY_LATER"
      ? formatDateLabel(selectedOrder.creditDueDate)
      : "Immediate";

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
      const invoiceRef = targetOrder ? targetOrder.orderId : `RMO-${targetRawOrder!.id}`;
      const issueDate = formatDateLabel(new Date().toISOString());
      const deliveryDate = targetOrder?.deliveryDate || targetRawOrder?.createdAt;
      const invoiceId = `INV-${invoiceRef}`;
      const itemDescription = targetOrder
        ? `Concrete ${targetOrder.grade}`
        : `Raw Material ${targetRawOrder!.materialName}`;
      const itemQuantity = targetOrder
        ? `${targetOrder.quantity} m3`
        : `${targetRawOrder!.quantity} ${targetRawOrder!.unit}`;
      const targetDueDate =
        targetOrder && String(targetOrder.paymentOption || "").toUpperCase() === "PAY_LATER"
          ? formatDateLabel(targetOrder.creditDueDate)
          : "Immediate";
      const targetProject = targetOrder
        ? `Concrete ${targetOrder.grade}`
        : `Raw ${targetRawOrder!.materialName}`;
      const marginX = 14;
      const pageWidth = 210;
      const contentWidth = 182;

      let y = 12;
      pdf.setTextColor(148, 163, 184);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.text("EST. 2013", pageWidth / 2, y, { align: "center" });
      y += 6;
      pdf.setTextColor(100, 116, 139);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.text("RMC ERP", pageWidth / 2, y, { align: "center" });
      y += 4;
      pdf.setDrawColor(226, 232, 240);
      pdf.line(marginX, y, marginX + contentWidth, y);

      y += 8;
      pdf.setTextColor(37, 99, 145);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(17);
      pdf.text("INVOICE", marginX, y);

      pdf.setFontSize(8);
      pdf.setTextColor(71, 85, 105);
      pdf.text("Prepared For", 100, y - 2);
      pdf.text(customerName, 100, y + 2);
      pdf.text(customerEmail, 100, y + 6);
      pdf.text(customerPhone, 100, y + 10);
      pdf.text("Prepared By", 150, y - 2);
      pdf.text(COMPANY_NAME, 150, y + 2);
      pdf.text(COMPANY_EMAIL, 150, y + 6);
      pdf.text(COMPANY_PHONE, 150, y + 10);

      y += 18;
      pdf.setDrawColor(226, 232, 240);
      pdf.line(marginX, y, marginX + contentWidth, y);

      y += 6;
      pdf.setTextColor(100, 116, 139);
      pdf.setFontSize(7.5);
      pdf.text("Invoice #", marginX, y);
      pdf.text("Date", 62, y);
      pdf.text("Payment Due", 97, y);
      pdf.text("Project", 138, y);

      y += 5;
      pdf.setTextColor(15, 23, 42);
      pdf.setFontSize(9);
      pdf.text(invoiceId, marginX, y);
      pdf.text(issueDate, 62, y);
      pdf.text(targetDueDate, 97, y);
      pdf.text(targetProject, 138, y);

      y += 6;
      pdf.line(marginX, y, marginX + contentWidth, y);

      y += 8;
      pdf.setTextColor(100, 116, 139);
      pdf.setFontSize(8);
      pdf.text("Description", marginX, y);
      pdf.text("Quantity", 112, y);
      pdf.text("Rate", 142, y);
      pdf.text("Subtotal", 170, y);

      y += 4;
      pdf.line(marginX, y, marginX + contentWidth, y);

      y += 7;
      pdf.setTextColor(15, 23, 42);
      pdf.setFontSize(9);
      pdf.text(`${itemDescription} - Delivery ${formatDateLabel(deliveryDate)}`, marginX, y);
      pdf.text(itemQuantity, 112, y);
      pdf.text(formatCurrency(targetRatePerUnit), 142, y);
      pdf.text(formatCurrency(targetSubtotal), 170, y);

      y += 4;
      pdf.line(marginX, y, marginX + contentWidth, y);

      y += 10;
      pdf.setTextColor(71, 85, 105);
      pdf.setFontSize(8);
      pdf.text("TERMS & CONDITIONS", marginX, y);
      pdf.text("TOTAL", 160, y);

      y += 5;
      pdf.setFontSize(7);
      pdf.text("Please verify quantity and delivery details before receipt.", marginX, y);
      pdf.text(formatCurrency(targetTotalPayable), 170, y);
      y += 4;
      pdf.text("Late payment terms apply for approved pay-later orders.", marginX, y);
      pdf.text(`Tax ${GST_RATE}%`, 160, y);
      y += 4;
      pdf.text("This invoice is generated digitally and valid without signature.", marginX, y);

      y += 11;
      pdf.setTextColor(37, 99, 145);
      pdf.setFontSize(7);
      pdf.text("AMOUNT DUE", 130, y);
      y += 10;
      pdf.setFontSize(23);
      pdf.text(formatCurrency(targetTotalPayable), 130, y);

      y += 14;
      pdf.setDrawColor(226, 232, 240);
      pdf.line(marginX, y, marginX + contentWidth, y);
      y += 7;
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`${COMPANY_EMAIL} • ${COMPANY_PHONE}`, marginX, y);
      pdf.setFontSize(12);
      pdf.setTextColor(37, 99, 145);
      pdf.text("THANK YOU!", 170, y, { align: "right" });

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
            <h1 className="text-3xl mt-2 font-semibold">Billing and Invoice</h1>
            <p className="text-slate-200 mt-2 text-sm">Professional invoice summary with one-click PDF download.</p>
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
                  {downloadingPdf ? "Preparing PDF..." : "Download Invoice"}
                </button>
              </div>
              <div className="p-7">
                <div className="max-w-4xl mx-auto border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
                  <div className="px-8 pt-7 pb-3 text-center">
                    <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">EST. 2013</p>
                    <h3 className="mt-1 text-3xl font-semibold text-slate-500">RMC ERP</h3>
                    <div className="mt-4 border-t border-slate-200" />
                  </div>

                  <div className="px-8 pb-2 grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4 items-start">
                    <h2 className="text-4xl font-light text-sky-700 tracking-tight">INVOICE</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-[11px] text-slate-600">
                      <div>
                        <p className="font-semibold uppercase tracking-[0.12em] text-slate-500">Prepared For</p>
                        <p className="mt-1 text-slate-700">{customerName}</p>
                        <p>{customerEmail}</p>
                        <p>{customerPhone}</p>
                      </div>
                      <div>
                        <p className="font-semibold uppercase tracking-[0.12em] text-slate-500">Prepared By</p>
                        <p className="mt-1 text-slate-700">{COMPANY_NAME}</p>
                        <p>{COMPANY_ADDRESS}</p>
                        <p>{COMPANY_EMAIL}</p>
                        <p>{COMPANY_PHONE}</p>
                      </div>
                    </div>
                  </div>

                  <div className="px-8 pb-5">
                    <div className="border-y border-slate-200 py-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <p className="uppercase tracking-[0.12em] text-slate-400">Invoice #</p>
                        <p className="mt-1 text-slate-700 font-medium">{invoiceNumber}</p>
                      </div>
                      <div>
                        <p className="uppercase tracking-[0.12em] text-slate-400">Date</p>
                        <p className="mt-1 text-slate-700 font-medium">{invoiceIssueDate}</p>
                      </div>
                      <div>
                        <p className="uppercase tracking-[0.12em] text-slate-400">Payment Due</p>
                        <p className="mt-1 text-slate-700 font-medium">{paymentDueDate}</p>
                      </div>
                      <div>
                        <p className="uppercase tracking-[0.12em] text-slate-400">Project</p>
                        <p className="mt-1 text-slate-700 font-medium">{invoiceItemDescription}</p>
                      </div>
                    </div>

                    <div className="overflow-x-auto mt-3">
                      <table className="w-full text-sm">
                        <thead className="text-slate-500 uppercase text-[11px] tracking-[0.12em] border-b border-slate-200">
                          <tr>
                            <th className="text-left py-3">Description</th>
                            <th className="text-right py-3">Hours/Amount</th>
                            <th className="text-right py-3">Price/Rate</th>
                            <th className="text-right py-3">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-slate-100">
                            <td className="py-3 text-slate-700">
                              <p className="font-medium">{invoiceItemDescription}</p>
                              <p className="text-xs text-slate-500">Delivery: {invoiceDeliveryDate}</p>
                              <p className="text-xs text-slate-500">Status: {formatStatusLabel(paymentStatus)}</p>
                            </td>
                            <td className="py-3 text-right text-slate-700">{invoiceItemQuantity}</td>
                            <td className="py-3 text-right text-slate-700">{formatCurrency(invoiceRate)}</td>
                            <td className="py-3 text-right text-slate-800 font-semibold">{formatCurrency(subtotal)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">Terms & Conditions</p>
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          Please verify quantity and delivery details before accepting the order.
                          For approved credit orders, late payment terms may apply based on policy.
                        </p>
                        <p className="mt-3 text-xs text-slate-500">Billing Contact: {COMPANY_EMAIL}</p>
                      </div>

                      <div className="md:pl-8">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between text-slate-700">
                            <span>Total</span>
                            <span>{formatCurrency(subtotal)}</span>
                          </div>
                          <div className="flex justify-between text-slate-700">
                            <span>Taxes</span>
                            <span>{GST_RATE}%</span>
                          </div>
                          <div className="flex justify-between text-slate-700">
                            <span>Payment Status</span>
                            <span>{formatStatusLabel(paymentStatus)}</span>
                          </div>
                        </div>

                        <div className="mt-4 border-t border-slate-200 pt-3">
                          <p className="text-xs uppercase tracking-[0.14em] text-sky-700">Amount Due</p>
                          <p className="mt-2 text-5xl font-light text-sky-700 leading-none">{formatCurrency(totalPayable)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 border-t border-slate-200 pt-3 flex items-center justify-between text-xs">
                      <p className="text-slate-500">This is a system-generated invoice and valid without signature.</p>
                      <p className="text-sky-700 text-3xl font-light tracking-wide">THANK YOU!</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-600">Download this invoice in the same professional format as PDF.</span>
                  <button onClick={handleDownloadPdf} disabled={downloadingPdf} className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-medium">
                    {downloadingPdf ? "Preparing PDF..." : "Download Invoice"}
                  </button>
                </div>

                {selectedOrder && String(selectedOrder.paymentOption || "").toUpperCase() === "PAY_LATER" && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <p><strong>Payment Option:</strong> Pay Later</p>
                    <p><strong>Credit Status:</strong> {formatStatusLabel(selectedOrder.creditApprovalStatus || "PENDING")}</p>
                    <p><strong>Credit Due Date:</strong> {formatDateLabel(selectedOrder.creditDueDate)}</p>
                    <p><strong>Admin Remark:</strong> {selectedOrder.creditReviewRemark || "-"}</p>
                  </div>
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
                        {downloadingPdf ? "Preparing PDF..." : "Download Invoice"}
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
                      {downloadingPdf ? "Preparing PDF..." : "Download Invoice"}
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
