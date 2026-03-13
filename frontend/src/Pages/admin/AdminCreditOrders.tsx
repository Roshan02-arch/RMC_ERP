import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { normalizeRole } from "../../utils/auth";
import { API_BASE_URL } from "../../api/api";

type PendingOrder = {
  id: number;
  orderId: string;
  customerName?: string;
  grade?: string;
  quantity: number;
  totalPrice: number;
  status?: string;
  paymentType?: string;
  paymentOption?: string;
  creditPeriod?: string;
  creditDays?: number;
  creditDueDate?: string;
  creditApprovalStatus?: string;
  createdAt?: string;
  approvedAt?: string;
  creditReviewedAt?: string;
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

const AdminCreditOrders = () => {
  const navigate = useNavigate();
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [pendingCreditOrders, setPendingCreditOrders] = useState<PendingOrder[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<PendingOrder[]>([]);
  const [message, setMessage] = useState("");
  const [busyOrderId, setBusyOrderId] = useState("");

  const upper = (value?: string) => String(value || "").trim().toUpperCase();
  const isNetworkError = (error: unknown) => error instanceof TypeError;

  const fetchJsonWithFallback = async (urls: string[]) => {
    let lastResponse: Response | null = null;
    for (const url of urls) {
      const response = await fetch(`${API_BASE_URL}${url}`);
      lastResponse = response;
      if (response.ok) {
        return response.json();
      }
    }
    throw new Error(`Unable to load from endpoints. Last status: ${lastResponse?.status || "unknown"}`);
  };

  const fetchAll = async () => {
    try {
      const [ordersData, creditsData, allOrdersData] = await Promise.all([
        fetchJsonWithFallback([
          "/api/admin/pending-orders",
          "/api/admin/orders/pending",
        ]),
        fetchJsonWithFallback([
          "/api/admin/pending-credit-orders",
        ]).catch(() => []),
        fetchJsonWithFallback([
          "/api/admin/orders",
        ]),
      ]);

      const safeOrders = Array.isArray(ordersData) ? ordersData : [];
      const safeCreditsFromApi = Array.isArray(creditsData) ? creditsData : [];
      const safeAllOrders = Array.isArray(allOrdersData) ? allOrdersData : [];

      const fallbackCreditRows = safeAllOrders.filter((order: PendingOrder) => {
        const paymentType = upper(order.paymentType || order.paymentOption);
        const creditApproval = upper(order.creditApprovalStatus);
        return paymentType === "PAY_LATER" && ["PENDING", "PENDING_APPROVAL"].includes(creditApproval);
      });

      const historyRows = safeAllOrders
        .filter((order: PendingOrder) => {
          const orderStatus = upper(order.status);
          const creditApproval = upper(order.creditApprovalStatus);
          return ["APPROVED", "REJECTED"].includes(orderStatus) || ["APPROVED", "REJECTED"].includes(creditApproval);
        })
        .sort((a: PendingOrder, b: PendingOrder) => Number(b.id || 0) - Number(a.id || 0))
        .slice(0, 50);

      const orderApprovalRows = safeOrders.filter((order: PendingOrder) => {
        const paymentType = upper(order.paymentType || order.paymentOption);
        return paymentType !== "PAY_LATER";
      });

      setPendingOrders(orderApprovalRows);
      setPendingCreditOrders(safeCreditsFromApi.length > 0 ? safeCreditsFromApi : fallbackCreditRows);
      setApprovalHistory(historyRows);
    } catch (error) {
      console.error(error);
      setMessage(
        isNetworkError(error)
          ? `Backend connection failed. Start backend server on ${API_BASE_URL}.`
          : "Unable to load approval data right now.",
      );
    }
  };

  useEffect(() => {
    const role = normalizeRole(localStorage.getItem("role"));
    if (role !== "ADMIN") {
      navigate("/login");
      return;
    }

    void fetchAll();
  }, [navigate]);

  const runAction = async (requests: Array<{ url: string; method: "POST" | "PUT" }>, successMessage: string) => {
    try {
      let response: Response | null = null;

      for (const request of requests) {
        response = await fetch(`${API_BASE_URL}${request.url}`, { method: request.method });
        if (response.ok) {
          break;
        }
      }

      if (!response) {
        setMessage("Action failed.");
        return;
      }

      const raw = await response.text();
      let backendMessage = "";
      try {
        const parsed = raw ? JSON.parse(raw) : {};
        backendMessage = parsed.message || "";
      } catch {
        backendMessage = raw || "";
      }

      if (!response.ok) {
        setMessage(backendMessage || "Action failed.");
        return;
      }

      setMessage(backendMessage || successMessage);
      await fetchAll();
    } catch (error) {
      console.error(error);
      setMessage(
        isNetworkError(error)
          ? `Backend connection failed. Start backend server on ${API_BASE_URL}.`
          : "Unable to process action.",
      );
    }
  };

  const actionButton = (
    orderId: string,
    label: string,
    className: string,
    requests: Array<{ url: string; method: "POST" | "PUT" }>,
    successMessage: string,
  ) => (
    <button
      type="button"
      onClick={async () => {
        setBusyOrderId(orderId);
        await runAction(requests, successMessage);
        setBusyOrderId("");
      }}
      disabled={busyOrderId === orderId}
      className={`rounded-md px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60 ${className}`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-md">
        <h2 className="text-xl font-semibold text-gray-800">Approval Page</h2>
        {message && (
          <p className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">{message}</p>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-md">
        <h3 className="text-lg font-semibold text-gray-800">Order Approval Table</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm text-left text-gray-700">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Customer Name</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3">Total Price</th>
                <th className="px-4 py-3">Payment Type</th>
                <th className="px-4 py-3">Order Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pendingOrders.map((order) => (
                <tr key={`order-${order.orderId}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{order.orderId}</td>
                  <td className="px-4 py-3">{order.customerName || "-"}</td>
                  <td className="px-4 py-3">{order.grade || "-"}</td>
                  <td className="px-4 py-3">{order.quantity} m3</td>
                  <td className="px-4 py-3">{formatCurrency(order.totalPrice)}</td>
                  <td className="px-4 py-3">{(order.paymentType || order.paymentOption || "-").replaceAll("_", " ")}</td>
                  <td className="px-4 py-3">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {actionButton(
                        order.orderId,
                        "Accept Order",
                        "bg-emerald-600 hover:bg-emerald-500",
                        [
                          {
                            url: `/api/admin/order/approve/${encodeURIComponent(order.orderId)}`,
                            method: "POST",
                          },
                          {
                            url: `/api/admin/orders/${encodeURIComponent(order.orderId)}/approve`,
                            method: "PUT",
                          },
                        ],
                        "Order approved",
                      )}
                      {actionButton(
                        order.orderId,
                        "Reject Order",
                        "bg-rose-600 hover:bg-rose-500",
                        [
                          {
                            url: `/api/admin/order/reject/${encodeURIComponent(order.orderId)}`,
                            method: "POST",
                          },
                          {
                            url: `/api/admin/orders/${encodeURIComponent(order.orderId)}/reject`,
                            method: "PUT",
                          },
                        ],
                        "Order rejected",
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {pendingOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No pending order approvals.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-md">
        <h3 className="text-lg font-semibold text-gray-800">Credit Approval Table</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm text-left text-gray-700">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Customer Name</th>
                <th className="px-4 py-3">Credit Period</th>
                <th className="px-4 py-3">Credit Days</th>
                <th className="px-4 py-3">Total Price</th>
                <th className="px-4 py-3">Credit Due Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pendingCreditOrders.map((order) => (
                <tr key={`credit-${order.orderId}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{order.orderId}</td>
                  <td className="px-4 py-3">{order.customerName || "-"}</td>
                  <td className="px-4 py-3">{order.creditPeriod || "-"}</td>
                  <td className="px-4 py-3">{order.creditDays ?? "-"}</td>
                  <td className="px-4 py-3">{formatCurrency(order.totalPrice)}</td>
                  <td className="px-4 py-3">{formatDate(order.creditDueDate)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {actionButton(
                        order.orderId,
                        "Accept Credit",
                        "bg-emerald-600 hover:bg-emerald-500",
                        [
                          {
                            url: `/api/admin/credit/approve/${encodeURIComponent(order.orderId)}`,
                            method: "POST",
                          },
                          {
                            url: `/api/admin/orders/${encodeURIComponent(order.orderId)}/credit/approve`,
                            method: "PUT",
                          },
                        ],
                        "Credit approved",
                      )}
                      {actionButton(
                        order.orderId,
                        "Reject Credit",
                        "bg-rose-600 hover:bg-rose-500",
                        [
                          {
                            url: `/api/admin/credit/reject/${encodeURIComponent(order.orderId)}`,
                            method: "POST",
                          },
                          {
                            url: `/api/admin/orders/${encodeURIComponent(order.orderId)}/credit/reject`,
                            method: "PUT",
                          },
                        ],
                        "Credit rejected",
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {pendingCreditOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No pending credit approvals.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-md">
        <h3 className="text-lg font-semibold text-gray-800">Approval History</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm text-left text-gray-700">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Customer Name</th>
                <th className="px-4 py-3">Approval Type</th>
                <th className="px-4 py-3">Decision</th>
                <th className="px-4 py-3">Payment Method</th>
                <th className="px-4 py-3">Updated Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {approvalHistory.map((order) => {
                const status = upper(order.status);
                const creditStatus = upper(order.creditApprovalStatus);
                const isCreditDecision = ["APPROVED", "REJECTED"].includes(creditStatus);
                const decision = isCreditDecision ? creditStatus : status;
                const updatedDate = order.creditReviewedAt || order.approvedAt || order.createdAt;

                return (
                  <tr key={`history-${order.orderId}-${order.id}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{order.orderId}</td>
                    <td className="px-4 py-3">{order.customerName || "-"}</td>
                    <td className="px-4 py-3">{isCreditDecision ? "Credit Approval" : "Order Approval"}</td>
                    <td className="px-4 py-3">{decision || "-"}</td>
                    <td className="px-4 py-3">{(order.paymentType || order.paymentOption || "-").replaceAll("_", " ")}</td>
                    <td className="px-4 py-3">{formatDate(updatedDate)}</td>
                  </tr>
                );
              })}

              {approvalHistory.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No approval history yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AdminCreditOrders;
