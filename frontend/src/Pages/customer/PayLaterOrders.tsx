import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../api/api";
import { useLocation, useNavigate } from "react-router-dom";
import { normalizeRole } from "../../utils/auth";

type Order = {
  id: number;
  orderId: string;
  grade: string;
  quantity: number;
  totalPrice: number;
  status: string;
  address?: string;
  paymentOption?: string;
  creditPeriod?: string;
  creditDays?: number;
  creditApprovalStatus?: string;
  creditRequestedAt?: string;
  creditReviewedAt?: string;
  creditDueDate?: string;
  creditReviewRemark?: string;
  approvedAt?: string;
  latestNotification?: string;
  orderWorkflowStatus?: string;
  paymentReceivedAt?: string;
  paymentStatus?: string;
  reminderIntervalDays?: number;
  lastReminderSentAt?: string;
  createdAt?: string;
  userId?: number;
  customerName?: string;
  customerPhone?: string;
};

const formatValue = (value?: string) => (value ? new Date(value).toLocaleString() : "-");
const labelize = (value?: string) => (value || "PENDING").replaceAll("_", " ");
const isDueDateReached = (value?: string) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() <= Date.now();
};
const isDueSoon = (value?: string, withinDays = 3) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const diff = date.getTime() - Date.now();
  return diff > 0 && diff <= withinDays * 24 * 60 * 60 * 1000;
};
const isPaid = (order: Order) =>
  !!order.paymentReceivedAt ||
  String(order.paymentStatus || "").toUpperCase() === "PAID" ||
  String(order.status || "").toUpperCase() === "DELIVERED" ||
  String(order.orderWorkflowStatus || "").toUpperCase().includes("PAYMENT_SUCCESSFUL") ||
  String(order.orderWorkflowStatus || "").toUpperCase().includes("ORDER_CONFIRMED") ||
  String(order.orderWorkflowStatus || "").toUpperCase() === "COMPLETED" ||
  String(order.orderWorkflowStatus || "").toUpperCase() === "PAID";

const isPayLaterOrder = (order: Order) => {
  const paymentOption = String(order.paymentOption || "").toUpperCase();
  const workflow = String(order.orderWorkflowStatus || "").toUpperCase();
  const creditStatus = String(order.creditApprovalStatus || "").toUpperCase();
  return (
    paymentOption === "PAY_LATER" &&
    creditStatus !== "NOT_APPLICABLE" &&
    !workflow.startsWith("PAID")
  );
};

const PayLaterOrders = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state as { successMessage?: string; selectedOrderId?: string } | null) || null;
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState(navState?.successMessage || "");

  useEffect(() => {
    const role = normalizeRole(localStorage.getItem("role"));
    const userId = localStorage.getItem("userId");
    if (role !== "CUSTOMER" || !userId) {
      navigate("/login");
      return;
    }

    const load = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/orders/my-orders/${userId}`);
        if (!res.ok) {
          throw new Error("Failed to load orders");
        }
        const data: Order[] = await res.json();
        const items = (Array.isArray(data) ? data : [])
          .filter((order) => isPayLaterOrder(order))
          .sort((a, b) => b.id - a.id);
        setOrders(items);
      } catch (error) {
        console.error(error);
      }
    };

    void load();
  }, [navigate]);

  const selectedOrderId = navState?.selectedOrderId || "";
  const sortedOrders = useMemo(() => {
    if (!selectedOrderId) return orders;
    const selected = orders.find((order) => order.orderId === selectedOrderId);
    const remaining = orders.filter((order) => order.orderId !== selectedOrderId);
    return selected ? [selected, ...remaining] : orders;
  }, [orders, selectedOrderId]);

  const approvedPaymentPendingOrders = useMemo(
    () =>
      sortedOrders.filter((order) => {
        const approved = String(order.creditApprovalStatus || "").toUpperCase() === "APPROVED";
        const rejected = String(order.status || "").toUpperCase() === "REJECTED";
        return approved && !rejected && !isPaid(order);
      }),
    [sortedOrders],
  );

  const completedOrders = useMemo(
    () => sortedOrders.filter((order) => isPaid(order)),
    [sortedOrders],
  );

  const rejectedOrders = useMemo(
    () =>
      sortedOrders.filter((order) => {
        const rejectedStatus = String(order.status || "").toUpperCase() === "REJECTED";
        const rejectedCredit = String(order.creditApprovalStatus || "").toUpperCase() === "REJECTED";
        return rejectedStatus || rejectedCredit;
      }),
    [sortedOrders],
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-6xl mx-auto px-6 pt-28 pb-10 space-y-6">
        <section className="bg-white rounded-2xl shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900">Pay Later Orders</h1>
          <p className="text-sm text-gray-600 mt-1">
            Approved orders stay payment pending until online payment succeeds.
          </p>
        </section>

        {message && (
          <section className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
            <button onClick={() => setMessage("")} className="ml-3 font-semibold">Dismiss</button>
          </section>
        )}

        <section className="space-y-4">
          {sortedOrders.length === 0 && (
            <div className="bg-white rounded-2xl shadow-md p-6 text-sm text-gray-500">
              No pay later orders found.
            </div>
          )}

          {approvedPaymentPendingOrders.length > 0 && (
            <div className="bg-white rounded-2xl shadow-md p-4">
              <h2 className="text-lg font-semibold text-gray-900">Approved Orders (Payment Pending)</h2>
            </div>
          )}

          {approvedPaymentPendingOrders.map((order) => {
            const creditStatus = labelize(order.creditApprovalStatus);
            const orderStatus = labelize(order.orderWorkflowStatus || order.status);
            const approved = String(order.creditApprovalStatus || "").toUpperCase() === "APPROVED";
            const dueDateReached = isDueDateReached(order.creditDueDate);
            const dueSoon = isDueSoon(order.creditDueDate);
            const paid = isPaid(order);
            const paymentPending = !paid;
            const showDueSoonWarning = paymentPending && !dueDateReached && dueSoon && approved;

            return (
              <div key={order.orderId} className="bg-white rounded-2xl shadow-md p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{order.orderId}</h2>
                    <p className="text-sm text-gray-600">{order.grade} | {order.quantity} m3</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">{orderStatus}</span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                      Credit {creditStatus}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm text-gray-700">
                  <p><span className="font-semibold">Customer:</span> {order.customerName || localStorage.getItem("username") || "-"}</p>
                  <p><span className="font-semibold">Customer ID:</span> {order.userId || localStorage.getItem("userId") || "-"}</p>
                  <p><span className="font-semibold">Contact Number:</span> {order.customerPhone || localStorage.getItem("userNumber") || "-"}</p>
                  <p><span className="font-semibold">Requested Credit:</span> {order.creditDays || 0} days</p>
                  <p><span className="font-semibold">Credit Period:</span> {order.creditPeriod || (order.creditDays === 15 ? "7 - 15 Days" : "15 - 30 Days")}</p>
                  <p><span className="font-semibold">Order Date:</span> {formatValue(order.createdAt)}</p>
                  <p><span className="font-semibold">Request Date:</span> {formatValue(order.creditRequestedAt)}</p>
                  <p><span className="font-semibold">Approval Date:</span> {formatValue(order.creditReviewedAt || order.approvedAt)}</p>
                  <p><span className="font-semibold">Due Date:</span> {formatValue(order.creditDueDate)}</p>
                  <p><span className="font-semibold">Order Value:</span> Rs.{Number(order.totalPrice || 0).toFixed(2)}</p>
                  <p><span className="font-semibold">Payment Status:</span>{" "}
                    <span className={paid ? "text-emerald-700 font-semibold" : dueDateReached ? "text-red-700 font-semibold" : "text-amber-700 font-semibold"}>
                      {paid ? "PAID" : dueDateReached ? "OVERDUE" : "PENDING"}
                    </span>
                  </p>
                  <p><span className="font-semibold">Payment Received:</span> {formatValue(order.paymentReceivedAt)}</p>
                  <p><span className="font-semibold">Reminder Every:</span> {order.reminderIntervalDays || 2} day(s)</p>
                  <p><span className="font-semibold">Last Reminder:</span> {formatValue(order.lastReminderSentAt)}</p>
                  <p><span className="font-semibold">Admin Detail:</span> {order.creditReviewRemark || order.latestNotification || "-"}</p>
                </div>

                {showDueSoonWarning && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm text-amber-800 font-semibold">
                      ⏰ Payment due soon — Due: {formatValue(order.creditDueDate)}
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      Please arrange payment before the due date to avoid daily reminders.
                    </p>
                  </div>
                )}

                {paymentPending && (
                  <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-sky-700">
                      Approved - Payment Pending. Complete payment from the Order Approval Status page.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/order-approval-status/${encodeURIComponent(order.orderId)}`)
                      }
                      className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold"
                    >
                      Open Approval Status
                    </button>
                  </div>
                )}

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => navigate(`/pay-later-orders/${encodeURIComponent(order.orderId)}`)}
                    className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold"
                  >
                    View Full Order Details
                  </button>
                </div>
              </div>
            );
          })}

          {completedOrders.length > 0 && (
            <div className="bg-white rounded-2xl shadow-md p-4 mt-6">
              <h2 className="text-lg font-semibold text-gray-900">Completed Orders (Payment Successful)</h2>
            </div>
          )}

          {completedOrders.map((order) => (
            <div key={`completed-${order.orderId}`} className="bg-white rounded-2xl shadow-md p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{order.orderId}</h2>
                  <p className="text-sm text-gray-600">{order.grade} | {order.quantity} m3</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                  Order Confirmed / Payment Successful
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm text-gray-700">
                <p><span className="font-semibold">Order Value:</span> Rs.{Number(order.totalPrice || 0).toFixed(2)}</p>
                <p><span className="font-semibold">Payment Received:</span> {formatValue(order.paymentReceivedAt)}</p>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate(`/pay-later-orders/${encodeURIComponent(order.orderId)}`)}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold"
                >
                  View Full Order Details
                </button>
              </div>
            </div>
          ))}

          {rejectedOrders.length > 0 && (
            <div className="bg-white rounded-2xl shadow-md p-4 mt-6">
              <h2 className="text-lg font-semibold text-gray-900">Rejected Orders</h2>
            </div>
          )}

          {rejectedOrders.map((order) => (
            <div key={`rejected-${order.orderId}`} className="bg-white rounded-2xl shadow-md p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{order.orderId}</h2>
                  <p className="text-sm text-gray-600">{order.grade} | {order.quantity} m3</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">Rejected</span>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};

export default PayLaterOrders;
