import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { normalizeRole } from "../../utils/auth";
import { API_BASE_URL } from "../../api/api";

type OrderRow = {
  id: number;
  orderId: string;
  customerName?: string;
  grade: string;
  quantity: number;
  totalPrice: number;
  address?: string;
  createdAt?: string;
  paymentType?: string;
  paymentOption?: string;
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const AdminOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [message, setMessage] = useState("");
  const [deletingOrderId, setDeletingOrderId] = useState("");
  const isNetworkError = (error: unknown) => error instanceof TypeError;

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/orders`);
      const rows: OrderRow[] = await response.json();
      setOrders(Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.error(error);
      setMessage(
        isNetworkError(error)
          ? `Backend connection failed. Start backend server on ${API_BASE_URL}.`
          : "Unable to load orders right now.",
      );
    }
  };

  useEffect(() => {
    const role = normalizeRole(localStorage.getItem("role"));
    if (role !== "ADMIN") {
      navigate("/login");
      return;
    }

    void fetchOrders();
  }, [navigate]);

  const deleteOrder = async (orderId: string) => {
    try {
      setDeletingOrderId(orderId);
      const response = await fetch(`${API_BASE_URL}/api/admin/orders/${encodeURIComponent(orderId)}`, {
        method: "DELETE",
      });

      const raw = await response.text();
      let backendMessage = "";
      try {
        const parsed = raw ? JSON.parse(raw) : {};
        backendMessage = parsed.message || "";
      } catch {
        backendMessage = raw || "";
      }

      if (!response.ok) {
        setMessage(backendMessage || "Unable to delete order.");
        return;
      }

      setMessage(backendMessage || "Order deleted successfully.");
      await fetchOrders();
    } catch (error) {
      console.error(error);
      setMessage(
        isNetworkError(error)
          ? `Backend connection failed. Start backend server on ${API_BASE_URL}.`
          : "Unable to delete order.",
      );
    } finally {
      setDeletingOrderId("");
    }
  };

  return (
    <section className="rounded-2xl bg-white p-6 shadow-md">
      <h2 className="text-xl font-semibold text-gray-800">Orders</h2>
      {message && (
        <p className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">{message}</p>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-sm text-left text-gray-700">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-4 py-3">Order ID</th>
              <th className="px-4 py-3">Customer Name</th>
              <th className="px-4 py-3">Grade</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Total Price</th>
              <th className="px-4 py-3">Payment Method</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Created Date</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{order.orderId}</td>
                <td className="px-4 py-3">{order.customerName || "-"}</td>
                <td className="px-4 py-3">{order.grade || "-"}</td>
                <td className="px-4 py-3">{order.quantity} m3</td>
                <td className="px-4 py-3">{formatCurrency(order.totalPrice)}</td>
                <td className="px-4 py-3">{(order.paymentType || order.paymentOption || "-").replaceAll("_", " ")}</td>
                <td className="px-4 py-3">{order.address || "-"}</td>
                <td className="px-4 py-3">{formatDate(order.createdAt)}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => void deleteOrder(order.orderId)}
                    disabled={deletingOrderId === order.orderId}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-60"
                  >
                    Delete Order
                  </button>
                </td>
              </tr>
            ))}

            {orders.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default AdminOrders;
