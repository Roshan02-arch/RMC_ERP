import { useEffect, useMemo, useState } from "react";
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
  creditDays?: number;
  creditApprovalStatus?: string;
  creditRequestedAt?: string;
  creditReviewedAt?: string;
  creditDueDate?: string;
  creditReviewRemark?: string;
  approvedAt?: string;
  latestNotification?: string;
};

const formatValue = (value?: string) => (value ? new Date(value).toLocaleString() : "-");
const labelize = (value?: string) => (value || "PENDING").replaceAll("_", " ");

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
        const res = await fetch(`http://localhost:8080/api/orders/my-orders/${userId}`);
        if (!res.ok) {
          throw new Error("Failed to load orders");
        }
        const data: Order[] = await res.json();
        const items = (Array.isArray(data) ? data : [])
          .filter((order) => String(order.paymentOption || "").toUpperCase() === "PAY_LATER")
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

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-6xl mx-auto px-6 pt-28 pb-10 space-y-6">
        <section className="bg-white rounded-2xl shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900">Pay Later Orders</h1>
          <p className="text-sm text-gray-600 mt-1">
            View credit request approval, due date, and admin decision.
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

          {sortedOrders.map((order) => {
            const creditStatus = labelize(order.creditApprovalStatus);
            const orderStatus = labelize(order.status);
            const rejected = String(order.creditApprovalStatus || "").toUpperCase() === "REJECTED";
            const approved = String(order.creditApprovalStatus || "").toUpperCase() === "APPROVED";
            const canTrack = approved && ["APPROVED", "IN_PRODUCTION", "DISPATCHED", "DELIVERED"].includes(String(order.status || "").toUpperCase());
            const completed = String(order.status || "").toUpperCase() === "DELIVERED";

            return (
              <div key={order.orderId} className="bg-white rounded-2xl shadow-md p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{order.orderId}</h2>
                    <p className="text-sm text-gray-600">{order.grade} | {order.quantity} m3</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">{orderStatus}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${rejected ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                      Credit {creditStatus}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm text-gray-700">
                  <p><span className="font-semibold">Requested Credit:</span> {order.creditDays || 0} days</p>
                  <p><span className="font-semibold">Request Date:</span> {formatValue(order.creditRequestedAt)}</p>
                  <p><span className="font-semibold">Approval Date:</span> {formatValue(order.creditReviewedAt || order.approvedAt)}</p>
                  <p><span className="font-semibold">Due Date:</span> {formatValue(order.creditDueDate)}</p>
                  <p><span className="font-semibold">Order Value:</span> Rs.{Number(order.totalPrice || 0).toFixed(2)}</p>
                  <p><span className="font-semibold">Admin Detail:</span> {order.creditReviewRemark || order.latestNotification || "-"}</p>
                </div>

                {rejected && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-red-700">
                      Admin rejected the credit request. Click payment to complete the order.
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
                            successMessage: "Credit rejected by admin. Complete payment for this order.",
                          },
                        })
                      }
                      className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold"
                    >
                      Checkout Payment
                    </button>
                  </div>
                )}

                {(canTrack || completed) && (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-emerald-700">
                      {completed
                        ? "Order completed successfully. Open the completion page."
                        : "Credit and order approval are complete. You can track this order now."}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {canTrack && !completed && (
                        <button
                          type="button"
                          onClick={() =>
                            navigate("/delivery-tracking", {
                              state: { selectedOrderId: order.orderId },
                            })
                          }
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold"
                        >
                          Track Order
                        </button>
                      )}
                      {completed && (
                        <button
                          type="button"
                          onClick={() =>
                            navigate("/order-success", {
                              state: {
                                orderId: order.orderId,
                                selectedOrderId: order.orderId,
                                paymentId: "PAY_LATER_COMPLETED",
                                title: "Order Completed",
                                subtitle: "Your approved pay later order has been delivered successfully.",
                                orderStatusLabel: "Completed",
                                hideBillingButton: false,
                              },
                            })
                          }
                          className="px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold"
                        >
                          View Completion
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
};

export default PayLaterOrders;
