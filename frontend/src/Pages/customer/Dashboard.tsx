import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Clock,
  CheckCircle,
  Truck,
  CreditCard,
  Shield,
  Search,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";
import { normalizeRole } from "../../utils/auth";
import { ThemeContext } from "../../utils/ThemeContext";

interface Order {
  id: number;
  orderId: string;
  grade: string;
  quantity: number;
  status: string;
  deliveryTrackingStatus?: string;
}

const getDashboardStatus = (order: Order) => {
  const tracking = String(order.deliveryTrackingStatus || "").trim().toUpperCase();
  if (tracking === "SCHEDULED_FOR_DISPATCH") return "SCHEDULED";
  if (tracking === "ON_THE_WAY") return "IN_TRANSIT";
  if (tracking) return tracking;
  return String(order.status || "").trim().toUpperCase();
};

const PAGE_SIZE = 5;

const statusBadge = (status: string) => {
  if (status === "DELIVERED")
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  if (status === "PENDING_APPROVAL")
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  if (status === "IN_TRANSIT" || status === "DISPATCHED")
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  return "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
};

const quickActions = [
  { to: "/purchaseproduct", label: "Place Order", icon: ShoppingCart, color: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40" },
  { to: "/delivery-tracking", label: "Track Delivery", icon: Truck, color: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40" },
  { to: "/billing-payment", label: "View Bills", icon: CreditCard, color: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40" },
  { to: "/quality-access", label: "Quality Reports", icon: Shield, color: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40" },
] as const;

const Dashboard = () => {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const role = normalizeRole(localStorage.getItem("role"));
    const userId = localStorage.getItem("userId");

    if (role !== "CUSTOMER") {
      navigate("/login");
      return;
    }
    if (!userId) {
      navigate("/login");
      return;
    }

    fetch(`http://localhost:8080/api/orders/my-orders/${userId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch orders");
        }
        return res.json();
      })
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Fetch error:", err));
  }, [navigate]);

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const total = orders.length;
  const pending = orders.filter((order) => getDashboardStatus(order) === "PENDING_APPROVAL").length;
  const delivered = orders.filter((order) => getDashboardStatus(order) === "DELIVERED").length;

  const filteredOrders = orders.filter((order) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;
    return (
      (order.orderId || "").toLowerCase().includes(query) ||
      (order.grade || "").toLowerCase().includes(query) ||
      String(order.quantity ?? "").toLowerCase().includes(query) ||
      (order.status || "").toLowerCase().includes(query) ||
      (order.deliveryTrackingStatus || "").toLowerCase().includes(query)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedOrders = filteredOrders.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const stats = [
    { label: "Total Orders", value: total, icon: ShoppingCart, iconBg: "bg-blue-100 dark:bg-blue-900/30", iconColor: "text-blue-600 dark:text-blue-400" },
    { label: "Pending", value: pending, icon: Clock, iconBg: "bg-amber-100 dark:bg-amber-900/30", iconColor: "text-amber-600 dark:text-amber-400" },
    { label: "Delivered", value: delivered, icon: CheckCircle, iconBg: "bg-green-100 dark:bg-green-900/30", iconColor: "text-green-600 dark:text-green-400" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Welcome back — here's your overview.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleDarkMode}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            type="button"
            onClick={logout}
            className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, iconBg, iconColor }) => (
          <div
            key={label}
            className="group bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 p-5 flex items-center gap-4"
          >
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconBg} group-hover:scale-110 transition-transform duration-300`}>
              <Icon size={22} className={iconColor} />
            </div>
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
              <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickActions.map(({ to, label, icon: Icon, color }) => (
          <button
            key={to}
            type="button"
            onClick={() => navigate(to)}
            className={`flex flex-col items-center gap-2 rounded-xl p-4 text-sm font-medium transition-colors ${color}`}
          >
            <Icon size={22} />
            {label}
          </button>
        ))}
      </div>

      {/* Recent orders table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Recent Orders</h2>
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search orders…"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 pl-9 pr-3 py-2 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 text-xs uppercase text-slate-500 dark:text-slate-400">
                <th className="px-6 py-3 text-left font-semibold">Order ID</th>
                <th className="px-6 py-3 text-left font-semibold">Grade</th>
                <th className="px-6 py-3 text-left font-semibold">Quantity</th>
                <th className="px-6 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {paginatedOrders.map((order) => {
                const displayStatus = getDashboardStatus(order);
                return (
                  <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{order.orderId}</td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{order.grade}</td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{order.quantity} m³</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusBadge(displayStatus)}`}>
                        {displayStatus.replaceAll("_", " ")}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 px-5 py-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Page {safePage} of {totalPages} · {filteredOrders.length} order{filteredOrders.length !== 1 && "s"}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
                aria-label="Next page"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
