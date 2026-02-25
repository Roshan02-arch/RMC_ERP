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

  const updateStatus = async (orderId: string, status: string) => {
    await fetch(
      `http://localhost:8080/api/admin/orders/${orderId}/status?status=${status}`,
      { method: "PUT" }
    );

    void fetchOrders();
  };

  const deleteOrder = async (orderId: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this order?");
    if (!confirmed) {
      return;
    }

    const res = await fetch(`http://localhost:8080/api/admin/orders/${encodeURIComponent(orderId)}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const raw = await res.text();
      let message = "Delete failed";
      try {
        const data = JSON.parse(raw);
        message = data.message || message;
      } catch {
        if (raw) {
          message = raw;
        }
      }
      alert(message);
      return;
    }

    void fetchOrders();
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
        <h2 className="text-3xl font-bold text-gray-800 mb-8">All Orders</h2>

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
                {orders.map((order) => (
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
                          onClick={() => updateStatus(order.orderId, "APPROVED")}
                          className="px-4 py-1 text-xs font-medium bg-green-600 hover:bg-green-500 text-white rounded-md transition"
                        >
                          Approve
                        </button>

                        <button
                          onClick={() => updateStatus(order.orderId, "REJECTED")}
                          className="px-4 py-1 text-xs font-medium bg-red-600 hover:bg-red-500 text-white rounded-md transition"
                        >
                          Reject
                        </button>

                        <button
                          onClick={() => deleteOrder(order.orderId)}
                          className="px-4 py-1 text-xs font-medium bg-gray-700 hover:bg-gray-600 text-white rounded-md transition"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminOrders;
