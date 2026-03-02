import { useEffect, useState } from "react";
import { normalizeRole } from "../../utils/auth";

type OrderStatus =
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "IN_PRODUCTION"
  | "DISPATCHED"
  | "DELIVERED"
  | "REJECTED";

interface Order {
  id: number;
  orderId: string;
  grade: string;
  quantity: number;
  deliveryDate?: string;
  address?: string;
  totalPrice: number;
  status: OrderStatus;
}

const gradePricing: Record<string, number> = {
  M20: 5000,
  M25: 5500,
  M30: 6000,
  M35: 6500,
};

const PurchaseProduct = () => {
  const [grade, setGrade] = useState("");
  const [quantity, setQuantity] = useState<number>(0);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const role = normalizeRole(localStorage.getItem("role"));
    const userId = localStorage.getItem("userId");
    if (role !== "CUSTOMER" || !userId) {
      setOrders([]);
      return;
    }

    const fetchOrderHistory = async () => {
      try {
        const response = await fetch(`http://localhost:8080/api/orders/my-orders/${userId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch order history");
        }
        const data: Order[] = await response.json();
        const items = Array.isArray(data) ? data : [];
        items.sort((a, b) => b.id - a.id);
        setOrders(items);
      } catch (err) {
        console.error("Unable to load order history", err);
      }
    };

    void fetchOrderHistory();
  }, []);

  const calculateTotal = () => {
    if (!grade || quantity <= 0) return 0;
    return gradePricing[grade] * quantity;
  };

  const handleSubmit = () => {
    setError("");

    if (!grade || !quantity || !deliveryDate || !address) {
      setError("All fields are compulsory.");
      return;
    }

    setConfirmed(true);
  };

  const confirmOrder = async () => {
    try {
      setLoading(true);
      setError("");

      const userId = localStorage.getItem("userId");

      if (!userId) {
        setError("User not logged in");
        setLoading(false);
        return;
      }

      const response = await fetch("http://localhost:8080/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade,
          quantity,
          deliveryDate,
          address,
          userId: Number(userId),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Order failed");
        setLoading(false);
        return;
      }

      const newOrder: Order = {
        id: data.id,
        orderId: data.orderId,
        grade,
        quantity,
        deliveryDate,
        address,
        totalPrice: data.totalPrice,
        status: "PENDING_APPROVAL",
      };

      setOrders((prev) => [newOrder, ...prev]);
      setConfirmed(false);

      setGrade("");
      setQuantity(0);
      setDeliveryDate("");
      setAddress("");

      alert("Order placed successfully!");
    } catch {
      setError("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex items-center justify-center p-6 pt-24">
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Purchase Ready Mix Concrete
          </h2>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Concrete Grade
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm
                           focus:ring-2 focus:ring-indigo-500/30
                           focus:border-indigo-500 outline-none transition"
              >
                <option value="">Select Grade</option>
                {Object.keys(gradePricing).map((g) => (
                  <option key={g} value={g}>
                    {g} - Rs.{gradePricing[g]} per m3
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity (m3)
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm
                           focus:ring-2 focus:ring-indigo-500/30
                           focus:border-indigo-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Date and Time
              </label>
              <input
                type="datetime-local"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm
                           focus:ring-2 focus:ring-indigo-500/30
                           focus:border-indigo-500 outline-none transition"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Address
              </label>
              <textarea
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm
                           focus:ring-2 focus:ring-indigo-500/30
                           focus:border-indigo-500 outline-none transition"
              />
            </div>
          </div>

          <div className="mt-6 text-lg font-semibold text-gray-800">
            Total Price: <span className="text-indigo-600">Rs.{calculateTotal()}</span>
          </div>

          <div className="mt-6 flex gap-4">
            {!confirmed ? (
              <button
                onClick={handleSubmit}
                className="bg-indigo-600 hover:bg-indigo-500 text-white
                           px-6 py-3 rounded-lg font-medium transition shadow-md"
              >
                Review Order
              </button>
            ) : (
              <>
                <button
                  onClick={confirmOrder}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-500 text-white
                             px-6 py-3 rounded-lg font-medium transition shadow-md
                             disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? "Placing Order..." : "Confirm"}
                </button>

                <button
                  onClick={() => setConfirmed(false)}
                  disabled={loading}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700
                             px-6 py-3 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
              </>
            )}
          </div>

          <div className="my-10 border-t border-gray-200" />

          <h2 className="text-xl font-semibold text-gray-800 mb-6">Order History</h2>

          {orders.length === 0 && (
            <p className="text-gray-500 text-sm">No orders placed yet.</p>
          )}

          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm"
              >
                <p className="text-sm">
                  <strong>Order ID:</strong> {order.orderId}
                </p>
                <p className="text-sm">
                  <strong>Grade:</strong> {order.grade}
                </p>
                <p className="text-sm">
                  <strong>Quantity:</strong> {order.quantity} m3
                </p>
                <p className="text-sm">
                  <strong>Total:</strong> Rs.{order.totalPrice}
                </p>

                <p className="text-sm mt-2">
                  <strong>Status:</strong>{" "}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      order.status === "DELIVERED"
                        ? "bg-green-100 text-green-600"
                        : order.status === "REJECTED"
                        ? "bg-red-100 text-red-600"
                        : "bg-yellow-100 text-yellow-600"
                    }`}
                  >
                    {order.status.replaceAll("_", " ")}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseProduct;
