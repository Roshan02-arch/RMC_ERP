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

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);

  const fetchOrders = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/admin/orders");
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch orders", err);
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
      } catch (err) {
        console.error("Failed to fetch orders", err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await fetch(
        `http://localhost:8080/api/admin/orders/${orderId}/status?status=${status}`,
        { method: "PUT" }
      );

      void fetchOrders();
    } catch (err) {
      console.error("Status update failed", err);
    }
  };

  const deleteOrder = async (orderId: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this order?");
    if (!confirmed) {
      return;
    }

    try {
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
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === "PENDING_APPROVAL").length;
  const approvedOrders = orders.filter((o) => o.status === "APPROVED").length;

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-64 bg-slate-900 text-white flex flex-col p-6 space-y-8">
        <h2 className="text-2xl font-bold text-indigo-400">Admin Panel</h2>

        <nav className="flex flex-col space-y-4 text-sm">
          <button onClick={() => navigate("/admin")} className="text-left hover:text-indigo-400 transition">
            Dashboard
          </button>

          <button onClick={() => navigate("/admin/orders")} className="text-left hover:text-indigo-400 transition">
            Orders
          </button>

          <button onClick={() => navigate("/admin/users")} className="text-left hover:text-indigo-400 transition">
            Users
          </button>

          <button
            onClick={() => {
              localStorage.clear();
              navigate("/login");
            }}
            className="text-left text-red-400 hover:text-red-300 transition"
          >
            Logout
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h3 className="text-sm text-gray-500">Total Orders</h3>
            <p className="text-3xl font-bold text-gray-800">{totalOrders}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6">
            <h3 className="text-sm text-gray-500">Pending</h3>
            <p className="text-3xl font-bold text-yellow-600">{pendingOrders}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6">
            <h3 className="text-sm text-gray-500">Approved</h3>
            <p className="text-3xl font-bold text-green-600">{approvedOrders}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-6">All Orders</h2>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-gray-600">
              <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3">Order ID</th>
                  <th className="px-6 py-3">Grade</th>
                  <th className="px-6 py-3">Quantity</th>
                  <th className="px-6 py-3">Total</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">{order.orderId}</td>
                    <td className="px-6 py-4">{order.grade}</td>
                    <td className="px-6 py-4">{order.quantity} m3</td>
                    <td className="px-6 py-4 font-medium">Rs.{order.totalPrice}</td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          order.status === "APPROVED"
                            ? "bg-green-100 text-green-600"
                            : order.status === "PENDING_APPROVAL"
                            ? "bg-yellow-100 text-yellow-600"
                            : order.status === "REJECTED"
                            ? "bg-red-100 text-red-600"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus(order.orderId, "APPROVED")}
                          className="px-3 py-1 text-xs font-medium bg-green-600 hover:bg-green-500 text-white rounded-md transition"
                        >
                          Approve
                        </button>

                        <button
                          onClick={() => updateStatus(order.orderId, "REJECTED")}
                          className="px-3 py-1 text-xs font-medium bg-red-600 hover:bg-red-500 text-white rounded-md transition"
                        >
                          Reject
                        </button>

                        <button
                          onClick={() => deleteOrder(order.orderId)}
                          className="px-3 py-1 text-xs font-medium bg-gray-700 hover:bg-gray-600 text-white rounded-md transition"
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

export default AdminDashboard;
