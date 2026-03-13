import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiPackage,
  FiXCircle,
} from "react-icons/fi";
import { API_BASE_URL } from "../../api/api";

type HistoryEntry = {
  id: number;
  orderId: string;
  status: string;
  actionBy: string;
  actionTime: string;
  remarks: string;
};

type TimelineEventConfig = {
  icon: ReactNode;
  iconBg: string;
  label: string;
};

const getTimelineConfig = (status: string): TimelineEventConfig => {
  const s = String(status || "").toUpperCase();
  if (s === "ORDER_CREATED") return { icon: <FiPackage className="h-4 w-4 text-blue-600" />, iconBg: "bg-blue-100 ring-blue-200", label: "Order Created" };
  if (s === "APPROVED") return { icon: <FiCheckCircle className="h-4 w-4 text-emerald-600" />, iconBg: "bg-emerald-100 ring-emerald-200", label: "Approved by Admin" };
  if (s === "REJECTED") return { icon: <FiXCircle className="h-4 w-4 text-rose-600" />, iconBg: "bg-rose-100 ring-rose-200", label: "Rejected by Admin" };
  if (s === "PAYMENT_COMPLETED") return { icon: <FiCreditCard className="h-4 w-4 text-violet-600" />, iconBg: "bg-violet-100 ring-violet-200", label: "Payment Completed" };
  if (s === "PENDING_APPROVAL") return { icon: <FiClock className="h-4 w-4 text-amber-600" />, iconBg: "bg-amber-100 ring-amber-200", label: "Pending Admin Approval" };
  return { icon: <FiAlertCircle className="h-4 w-4 text-slate-500" />, iconBg: "bg-slate-100 ring-slate-200", label: String(status || "").replaceAll("_", " ") };
};

const buildAttemptLabels = (entries: HistoryEntry[]): Map<number, number> => {
  const map = new Map<number, number>();
  let n = 0;
  for (const e of entries) {
    if (e.status.toUpperCase() === "REJECTED") { n++; map.set(e.id, n); }
  }
  return map;
};

type StatusOrder = {
  orderId: string;
  grade: string;
  quantity: number;
  totalPrice: number;
  paymentMethod: string;
  paymentType?: string;
  paymentStatus?: string;
  orderWorkflowStatus?: string;
  status: string;
  createdAt?: string;
};

const badgeClassByStatus: Record<string, string> = {
  PENDING_APPROVAL: "bg-amber-100 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-100 text-rose-700 border-rose-200",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const labelFromStatus = (status: string) =>
  String(status || "").trim().toUpperCase().replaceAll("_", " ");

const OrderApprovalStatus = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId: routeOrderId } = useParams();

  const [order, setOrder] = useState<StatusOrder | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");

  const orderId = useMemo(() => {
    if (routeOrderId) return routeOrderId;

    const fromState = (location.state as { orderId?: string } | null)?.orderId || "";
    if (fromState) return fromState;

    const params = new URLSearchParams(location.search);
    const fromQuery = params.get("orderId") || "";
    if (fromQuery) return fromQuery;

    return localStorage.getItem("latest_order_approval_id") || "";
  }, [location.search, location.state, routeOrderId]);

  useEffect(() => {
    const run = async () => {
      const fetchAndParse = async (url: string) => {
        const response = await fetch(url);
        const raw = await response.text();
        let data: Record<string, unknown> = {};
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          data = { message: raw };
        }
        return { response, data };
      };

      // If no orderId available, try to look up the user's latest pending/approved order
      let resolvedOrderId = orderId;
      if (!resolvedOrderId) {
        const storedUserId = localStorage.getItem("userId");
        if (storedUserId) {
          try {
            const { response, data } = await fetchAndParse(
              `${API_BASE_URL}/api/orders/my-orders/${encodeURIComponent(storedUserId)}`
            );
            if (response.ok && Array.isArray(data)) {
              const relevant = (data as Record<string, unknown>[])
                .filter((o) => {
                  const payOpt = String(o.paymentOption || o.paymentType || "").toUpperCase();
                  const st = String(o.status || "").toUpperCase();
                  return (
                    (payOpt === "ONLINE" || payOpt === "CASH_ON_DELIVERY") &&
                    (st === "PENDING_APPROVAL" || st === "APPROVED")
                  );
                })
                .sort((a, b) => {
                  const ta = new Date(String(a.createdAt || 0)).getTime();
                  const tb = new Date(String(b.createdAt || 0)).getTime();
                  return tb - ta;
                });
              if (relevant.length > 0) {
                resolvedOrderId = String(relevant[0].orderId || "");
              }
            }
          } catch {
            // fall through to error below
          }
        }
      }

      if (!resolvedOrderId) {
        setError("No pending orders found. Place a new order to check its approval status.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const primary = await fetchAndParse(`${API_BASE_URL}/api/orders/status/${encodeURIComponent(resolvedOrderId)}`);

        if (primary.response.ok) {
          setOrder(primary.data as unknown as StatusOrder);
        } else {
          const fallback = await fetchAndParse(`${API_BASE_URL}/api/orders/orderId/${encodeURIComponent(resolvedOrderId)}`);
          if (!fallback.response.ok) {
            setError(String(primary.data.message || fallback.data.message || "Unable to load order approval status."));
            return;
          }

          const mapped: StatusOrder = {
            orderId: String(fallback.data.orderId || ""),
            grade: String(fallback.data.grade || "-"),
            quantity: Number(fallback.data.quantity || 0),
            totalPrice: Number(fallback.data.totalPrice || 0),
            paymentMethod: String(fallback.data.paymentMethod || fallback.data.paymentOption || "-"),
            paymentType: String(fallback.data.paymentType || ""),
            paymentStatus: String(
              fallback.data.paymentStatus
                || (fallback.data.paymentReceivedAt ? "PAID" : "PENDING")
            ),
            orderWorkflowStatus: String(fallback.data.orderWorkflowStatus || ""),
            status: String(fallback.data.status || "PENDING_APPROVAL"),
            createdAt: String(fallback.data.createdAt || ""),
          };
          setOrder(mapped);
        }

        setHistoryLoading(true);
        try {
          const historyRes = await fetch(`${API_BASE_URL}/api/orders/approval-history/${encodeURIComponent(resolvedOrderId)}`);
          if (historyRes.ok) {
            const historyData = await historyRes.json();
            setHistory(Array.isArray(historyData) ? historyData : []);
          }
        } catch {
          setHistory([]);
        } finally {
          setHistoryLoading(false);
        }
      } catch {
        setError("Unable to load order approval status. Please ensure backend is running.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [orderId]);

  const currentStatus = String(order?.status || "").trim().toUpperCase();
  const paymentMethod = String(order?.paymentMethod || "").trim().toUpperCase();
  const paymentStatus = String(order?.paymentStatus || "").trim().toUpperCase();
  const isOnlinePayment = paymentMethod === "ONLINE";
  const isCodPayment = paymentMethod === "CASH_ON_DELIVERY";
  const shouldShowPayOnline = currentStatus === "APPROVED" && isOnlinePayment && paymentStatus !== "PAID";
  const shouldShowTrackOrder = currentStatus === "APPROVED" && (!isOnlinePayment || paymentStatus === "PAID");
  const badgeClass = badgeClassByStatus[currentStatus] || "bg-slate-100 text-slate-700 border-slate-200";

  let title = "Order Approval Status";
  let message = "Your order has been placed successfully and is waiting for admin approval.";
  if (currentStatus === "APPROVED") {
    title = "Order Approved";
    if (shouldShowPayOnline) {
      message = "Your order has been approved successfully. Please complete payment to place the order.";
    } else if (isCodPayment) {
      message = "Your order has been approved and will be delivered.";
    } else {
      message = "Payment successful. Your order has been placed.";
    }
  } else if (currentStatus === "REJECTED") {
    title = "Order Rejected";
    message = "Admin rejected your order. Please place a new order.";
  } else if (currentStatus === "PENDING_APPROVAL") {
    title = "Order Pending Approval";
  }

  const attemptLabels = buildAttemptLabels(history);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.09)] sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">Order Tracking</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{title}</h1>

          {loading ? (
            <div className="mt-8 flex items-center gap-3 text-sm text-slate-600">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
              Loading order approval status...
            </div>
          ) : error ? (
            <div className="mt-6">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {error}
              </div>
              <button
                type="button"
                onClick={() => navigate("/purchase-product")}
                className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Shop Now
              </button>
            </div>
          ) : order ? (
            <>
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="grid grid-cols-1 gap-4 text-sm text-slate-700 sm:grid-cols-2">
                  <p><span className="font-semibold text-slate-900">Order ID:</span> {order.orderId}</p>
                  <p><span className="font-semibold text-slate-900">Product Grade:</span> {order.grade}</p>
                  <p><span className="font-semibold text-slate-900">Quantity:</span> {order.quantity}</p>
                  <p><span className="font-semibold text-slate-900">Total Price:</span> {formatCurrency(order.totalPrice)}</p>
                  <p><span className="font-semibold text-slate-900">Payment Method:</span> {(order.paymentMethod || "-").replaceAll("_", " ")}</p>
                  <p><span className="font-semibold text-slate-900">Order Date:</span> {formatDate(order.createdAt)}</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass}`}>
                    {labelFromStatus(order.status)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{message}</p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {shouldShowPayOnline && (
                  <button
                    type="button"
                    onClick={() => navigate(`/checkout-payment?orderId=${encodeURIComponent(order.orderId)}`)}
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
                  >
                    Complete Payment
                  </button>
                )}

                {shouldShowTrackOrder && (
                  <button
                    type="button"
                    onClick={() => navigate(`/order-tracking/${encodeURIComponent(order.orderId)}`)}
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
                  >
                    Track Order
                  </button>
                )}

                {currentStatus === "REJECTED" && (
                  <button
                    type="button"
                    onClick={() => navigate("/purchase-product")}
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Back to Products
                  </button>
                )}
              </div>
            </>
          ) : null}
        </section>

        {!loading && !error && order && (
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.09)] sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">Approval History</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">Order Activity Timeline</h2>

            {historyLoading ? (
              <div className="mt-6 flex items-center gap-3 text-sm text-slate-600">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
                Loading approval history...
              </div>
            ) : history.length === 0 ? (
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                No history available yet.
              </div>
            ) : (
              <ol className="mt-6 space-y-0">
                {history.map((entry, index) => {
                  const cfg = getTimelineConfig(entry.status);
                  const isLast = index === history.length - 1;
                  const rejectionAttempt = attemptLabels.get(entry.id);

                  return (
                    <li key={entry.id} className="relative flex gap-4">
                      {!isLast && (
                        <span
                          className="absolute left-[19px] top-10 h-[calc(100%-8px)] w-px bg-slate-200"
                          aria-hidden="true"
                        />
                      )}

                      <div className={`relative z-10 mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ring-2 ${cfg.iconBg}`}>
                        {cfg.icon}
                      </div>

                      <div className="pb-8 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{cfg.label}</span>
                          {rejectionAttempt !== undefined && (
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                              Attempt {rejectionAttempt}
                            </span>
                          )}
                        </div>

                        <p className="mt-0.5 text-xs text-slate-500">
                          {entry.actionBy && <span className="font-medium text-slate-600">{entry.actionBy}</span>}
                          {entry.actionBy && entry.actionTime ? " · " : ""}
                          {entry.actionTime ? formatDate(entry.actionTime) : ""}
                        </p>

                        {entry.remarks && (
                          <p className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                            {entry.remarks}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default OrderApprovalStatus;
