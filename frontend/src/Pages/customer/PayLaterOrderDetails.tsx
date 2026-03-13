import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { normalizeRole } from "../../utils/auth";

type PayLaterOrder = {
  id: number;
  orderId: string;
  grade: string;
  quantity: number;
  totalPrice: number;
  status: string;
  orderWorkflowStatus?: string;
  address?: string;
  paymentOption?: string;
  creditPeriod?: string;
  creditDays?: number;
  creditApprovalStatus?: string;
  creditDueDate?: string;
  creditRequestedAt?: string;
  creditReviewedAt?: string;
  paymentReceivedAt?: string;
  createdAt?: string;
  userId?: number;
  customerName?: string;
  customerPhone?: string;
};

const labelize = (value?: string) => (value || "-").replaceAll("_", " ");
const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const isDueDateReached = (value?: string) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() <= Date.now();
};

const PayLaterOrderDetails = () => {
  const navigate = useNavigate();
  const { orderId = "" } = useParams();
  const [order, setOrder] = useState<PayLaterOrder | null>(null);
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
        const response = await fetch(`http://localhost:8080/api/orders/my-orders/${userId}`);
        if (!response.ok) throw new Error("Failed to load order details");
        const rows: PayLaterOrder[] = await response.json();
        const match = (Array.isArray(rows) ? rows : []).find(
          (row) => row.orderId === orderId && String(row.paymentOption || "").toUpperCase() === "PAY_LATER",
        );
        setOrder(match || null);
      } catch (error) {
        console.error(error);
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [navigate, orderId]);

  const showPayNow = useMemo(() => {
    if (!order) return false;
    const rejected = String(order.creditApprovalStatus || "").toUpperCase() === "REJECTED";
    const approved = String(order.creditApprovalStatus || "").toUpperCase() === "APPROVED";
    const completedWorkflow = String(order.orderWorkflowStatus || "").toUpperCase() === "COMPLETED";
    const pendingPayment = !order.paymentReceivedAt;
    return rejected || (approved && isDueDateReached(order.creditDueDate) && pendingPayment && !completedWorkflow);
  }, [order]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <main className="max-w-4xl mx-auto px-6 pt-28 pb-10">
          <div className="bg-white rounded-2xl shadow-md p-6 text-sm text-gray-500">Loading order details...</div>
        </main>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-100">
        <main className="max-w-4xl mx-auto px-6 pt-28 pb-10 space-y-4">
          <div className="bg-white rounded-2xl shadow-md p-6 text-sm text-gray-600">Pay later order not found.</div>
          <button
            type="button"
            onClick={() => navigate("/pay-later-orders")}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold"
          >
            Back to Pay Later Orders
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-5xl mx-auto px-6 pt-28 pb-10 space-y-6">
        <section className="bg-white rounded-2xl shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900">Pay Later Order Details</h1>
          <p className="text-sm text-gray-600 mt-1">Order ID: {order.orderId}</p>
        </section>

        <section className="bg-white rounded-2xl shadow-md p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <p><span className="font-semibold">Customer Name:</span> {order.customerName || localStorage.getItem("username") || "-"}</p>
          <p><span className="font-semibold">Customer ID:</span> {order.userId || localStorage.getItem("userId") || "-"}</p>
          <p><span className="font-semibold">Contact Number:</span> {order.customerPhone || localStorage.getItem("userNumber") || "-"}</p>
          <p><span className="font-semibold">Delivery Address:</span> {order.address || "-"}</p>
          <p><span className="font-semibold">Order Item:</span> {order.grade}</p>
          <p><span className="font-semibold">Quantity:</span> {order.quantity} m3</p>
          <p><span className="font-semibold">Total Amount:</span> Rs.{Number(order.totalPrice || 0).toFixed(2)}</p>
          <p><span className="font-semibold">Selected Credit Period:</span> {order.creditPeriod || `${order.creditDays || 0} days`}</p>
          <p><span className="font-semibold">Order Date:</span> {formatDate(order.createdAt || order.creditRequestedAt)}</p>
          <p><span className="font-semibold">Expected Payment Due Date:</span> {formatDate(order.creditDueDate)}</p>
          <p><span className="font-semibold">Credit Approval Status:</span> {labelize(order.creditApprovalStatus)}</p>
          <p><span className="font-semibold">Order Status:</span> {labelize(order.orderWorkflowStatus || order.status)}</p>
          <p><span className="font-semibold">Payment Received:</span> {formatDate(order.paymentReceivedAt)}</p>
          <p><span className="font-semibold">Credit Reviewed At:</span> {formatDate(order.creditReviewedAt)}</p>
        </section>

        {showPayNow && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-red-700">
              Admin rejected your credit request. Complete your payment to place order.
            </p>
            <button
              type="button"
              onClick={() =>
                navigate("/checkout-payment", {
                  state: {
                    existingOrderId: order.orderId,
                    existingOrderLabel: `${order.orderId} - ${order.grade}`,
                    existingAmount: Number(order.totalPrice || 0),
                    existingAddress: order.address,
                    existingDeliveryDate: order.creditDueDate,
                  },
                })
              }
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold"
            >
              Checkout Payment
            </button>
          </section>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navigate("/pay-later-orders")}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold"
          >
            Back to Pay Later Orders
          </button>
        </div>
      </main>
    </div>
  );
};

export default PayLaterOrderDetails;
