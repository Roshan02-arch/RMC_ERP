import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Order {
  id: number;
  orderId: string;
  grade: string;
  quantity: number;
  totalPrice: number;
  status: string;
}

const AdminOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmOrderId, setConfirmOrderId] = useState<string | null>(null);
  const [showMessageBox, setShowMessageBox] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const openMessageBox = (message: string) => {
    setMessageText(message);
    setShowMessageBox(true);
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/admin/orders");
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "ADMIN") {
      navigate("/login");
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const res = await fetch("http://localhost:8080/api/admin/orders");
        const data = await res.json();
        if (mounted) {
          setOrders(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const filteredOrders = orders.filter((order) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return true;
    }
    return (
      (order.orderId || "").toLowerCase().includes(query) ||
      (order.grade || "").toLowerCase().includes(query) ||
      String(order.quantity ?? "").toLowerCase().includes(query) ||
      String(order.totalPrice ?? "").toLowerCase().includes(query) ||
      (order.status || "").toLowerCase().includes(query)
    );
  });

  const deleteOrder = async (orderId: string) => {
    try {
      setIsDeleting(true);
      const res = await fetch(`http://localhost:8080/api/admin/orders/${encodeURIComponent(orderId)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const raw = await res.text();
        let message = "Delete failed";
        try {
          const data = JSON.parse(raw);
          const backendMessage = data.message || "";
          const backendError = data.error || "";
          message = backendMessage || message;
          if (backendError) {
            message = `${message}: ${backendError}`;
          }
        } catch {
          if (raw) {
            message = raw;
          }
        }
        openMessageBox(message);
        return;
      }

      void fetchOrders();
      openMessageBox("Order deleted successfully.");
    } catch (err) {
      console.error("Delete failed", err);
      openMessageBox("Unable to delete order. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-64 bg-slate-900 text-white flex flex-col p-6 shadow-xl">
        <h2 className="text-2xl font-bold text-indigo-400 mb-10">Admin Panel</h2>

        <nav className="flex flex-col gap-4 text-sm font-medium">
          <button
            onClick={() => navigate("/admin")}
            className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition"
          >
            Dashboard
          </button>

          <button
            onClick={() => navigate("/admin/orders")}
            className="text-left px-3 py-2 rounded-lg bg-slate-800"
          >
            Orders
          </button>

          <button
            onClick={() => navigate("/admin/users")}
            className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition"
          >
            Users
          </button>

          <button
            onClick={() => navigate("/admin/adminlogins")}
            className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition"
          >
            Admin Logins
          </button>

          <button
            onClick={() => navigate("/admin/schedule")}
            className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition"
          >
            Schedule
          </button>

          <button
            onClick={() => navigate("/admin/inventory")}
            className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition"
          >
            Inventory
          </button>

          <button
            onClick={() => {
              localStorage.clear();
              navigate("/login");
            }}
            className="text-left px-3 py-2 rounded-lg text-red-400 hover:bg-slate-800 hover:text-red-300 transition"
          >
            Logout
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-10">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">All Orders</h2>
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
                  <th className="px-6 py-4 text-left">Order ID</th>
                  <th className="px-6 py-4 text-left">Grade</th>
                  <th className="px-6 py-4 text-left">Quantity</th>
                  <th className="px-6 py-4 text-left">Total</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-left">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-gray-800">{order.orderId}</td>
                    <td className="px-6 py-4">{order.grade}</td>
                    <td className="px-6 py-4">{order.quantity} m3</td>
                    <td className="px-6 py-4 font-semibold text-gray-700">Rs.{order.totalPrice}</td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-4 py-1 rounded-full text-xs font-semibold ${
                          order.status === "APPROVED"
                            ? "bg-green-100 text-green-700"
                            : order.status === "PENDING_APPROVAL"
                            ? "bg-yellow-100 text-yellow-700"
                            : order.status === "REJECTED"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmOrderId(order.orderId)}
                          disabled={isDeleting}
                          className="px-4 py-1 text-xs font-medium bg-gray-700 hover:bg-gray-600 text-white rounded-md transition"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-6 text-center text-gray-500">
                      No orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {confirmOrderId && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800">Confirm Delete</h3>
            <p className="text-sm text-gray-600 mt-2">Are you sure you want to delete this order?</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOrderId(null)}
                className="px-4 py-2 text-sm rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const orderId = confirmOrderId;
                  setConfirmOrderId(null);
                  if (orderId) {
                    void deleteOrder(orderId);
                  }
                }}
                className="px-4 py-2 text-sm rounded-md bg-red-600 hover:bg-red-500 text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showMessageBox && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800">Message</h3>
            <p className="text-sm text-gray-700 mt-2">{messageText}</p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowMessageBox(false)}
                className="px-4 py-2 text-sm rounded-md bg-gray-900 hover:bg-gray-800 text-white"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
