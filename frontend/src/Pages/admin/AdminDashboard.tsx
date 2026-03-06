import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Users,
  Shield,
  Calendar,
  Warehouse,
  LogOut,
  Clock,
  CheckCircle,
  DollarSign,
  TrendingUp,
  Bell,
  Search,
  Menu,
  X,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { PieLabelRenderProps } from "recharts";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ThemeContext } from "../../App";

interface Order {
  id: number;
  orderId: string;
  grade: string;
  quantity: number;
  totalPrice: number;
  status: string;
}

const ITEMS_PER_PAGE = 5;

const STATUS_COLORS: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  DELIVERED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const PIE_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

const NAV_ITEMS = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { label: "Orders", path: "/admin/orders", icon: Package },
  { label: "Users", path: "/admin/users", icon: Users },
  { label: "Admin Logins", path: "/admin/adminlogins", icon: Shield },
  { label: "Schedule", path: "/admin/schedule", icon: Calendar },
  { label: "Inventory", path: "/admin/inventory", icon: Warehouse },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchOrders = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/admin/orders");
      const data: unknown = await res.json();
      setOrders(Array.isArray(data) ? (data as Order[]) : []);
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
        const data: unknown = await res.json();
        if (mounted) {
          setOrders(Array.isArray(data) ? (data as Order[]) : []);
        }
      } catch (err) {
        console.error("Failed to fetch orders", err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const deleteOrder = async (orderId: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this order?");
    if (!confirmed) {
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:8080/api/admin/orders/${encodeURIComponent(orderId)}`,
        { method: "DELETE" },
      );

      if (!res.ok) {
        const raw = await res.text();
        let message = "Delete failed";
        try {
          const data: unknown = JSON.parse(raw);
          if (typeof data === "object" && data !== null && "message" in data) {
            message = String((data as { message: unknown }).message) || message;
          }
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

  // Stats
  const totalOrders = orders.length;
  const deliveredOrders = orders.filter((o) => o.status === "DELIVERED").length;
  const activeOrders = orders.filter((o) => o.status !== "DELIVERED").length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalPrice, 0);

  // Charts data
  const gradeChartData = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      map.set(o.grade, (map.get(o.grade) ?? 0) + 1);
    }
    return Array.from(map, ([grade, count]) => ({ grade, count }));
  }, [orders]);

  const statusChartData = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      map.set(o.status, (map.get(o.status) ?? 0) + 1);
    }
    return Array.from(map, ([status, value]) => ({ status, value }));
  }, [orders]);

  // Filtered & paginated orders
  const filteredOrders = useMemo(() => {
    if (!searchQuery) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter(
      (o) =>
        o.orderId.toLowerCase().includes(q) ||
        o.grade.toLowerCase().includes(q) ||
        o.status.toLowerCase().includes(q),
    );
  }, [orders, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const statsCards = [
    {
      title: "Total Orders",
      value: totalOrders,
      icon: Package,
      trend: "+12.5%",
      accent: "bg-blue-500",
      lightBg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: "Active Orders",
      value: activeOrders,
      icon: Clock,
      trend: "+8.2%",
      accent: "bg-orange-500",
      lightBg: "bg-orange-50 dark:bg-orange-900/20",
    },
    {
      title: "Delivered",
      value: deliveredOrders,
      icon: CheckCircle,
      trend: "+15.3%",
      accent: "bg-green-500",
      lightBg: "bg-green-50 dark:bg-green-900/20",
    },
    {
      title: "Total Revenue",
      value: `Rs.${totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      trend: "+5.7%",
      accent: "bg-purple-500",
      lightBg: "bg-purple-50 dark:bg-purple-900/20",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-900 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSidebarOpen(false);
          }}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Branding */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white">RMC ERP</h2>
            <p className="text-xs text-slate-400 mt-0.5">Admin Panel</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = item.path === "/admin";
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}

          <button
            onClick={() => {
              localStorage.clear();
              navigate("/login");
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors mt-4"
          >
            <LogOut size={18} />
            Logout
          </button>
        </nav>

        {/* Dark mode toggle at bottom */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={toggleDarkMode}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            {darkMode ? "Light Mode" : "Dark Mode"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top bar */}
        <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                aria-label="Open sidebar"
              >
                <Menu size={24} />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  <span className="text-gray-400 dark:text-gray-500">Admin</span>
                  {" / "}
                  <span className="text-blue-600 dark:text-blue-400">Dashboard</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="Notifications"
              >
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                A
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
            {statsCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-lg transition-shadow p-5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{card.title}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                        {card.value}
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        <TrendingUp size={14} className="text-green-500" />
                        <span className="text-xs font-medium text-green-500">{card.trend}</span>
                      </div>
                    </div>
                    <div className={`${card.lightBg} p-3 rounded-full`}>
                      <Icon size={22} className={`${card.accent} text-white rounded-full p-0.5`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
            {/* Bar chart - Orders by Grade */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                Orders by Grade
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gradeChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#E5E7EB"} />
                    <XAxis
                      dataKey="grade"
                      tick={{ fill: darkMode ? "#94A3B8" : "#6B7280", fontSize: 12 }}
                    />
                    <YAxis
                      tick={{ fill: darkMode ? "#94A3B8" : "#6B7280", fontSize: 12 }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: darkMode ? "#1E293B" : "#FFFFFF",
                        border: `1px solid ${darkMode ? "#334155" : "#E5E7EB"}`,
                        borderRadius: "8px",
                        color: darkMode ? "#F1F5F9" : "#1F2937",
                      }}
                    />
                    <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie chart - Status Distribution */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                Order Status Distribution
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      dataKey="value"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(props: PieLabelRenderProps) => {
                        const status = "name" in props ? String(props.name) : "";
                        const val = "value" in props ? String(props.value) : "";
                        return `${status} (${val})`;
                      }}
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell
                          key={entry.status}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: darkMode ? "#1E293B" : "#FFFFFF",
                        border: `1px solid ${darkMode ? "#334155" : "#E5E7EB"}`,
                        borderRadius: "8px",
                        color: darkMode ? "#F1F5F9" : "#1F2937",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Recent Orders
              </h3>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-600 dark:text-gray-300 uppercase text-xs">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Order ID</th>
                    <th className="px-5 py-3 font-semibold">Grade</th>
                    <th className="px-5 py-3 font-semibold">Quantity</th>
                    <th className="px-5 py-3 font-semibold">Total</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {paginatedOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-5 py-4 text-gray-800 dark:text-gray-200 font-medium">
                        {order.orderId}
                      </td>
                      <td className="px-5 py-4 text-gray-600 dark:text-gray-300">{order.grade}</td>
                      <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                        {order.quantity} m³
                      </td>
                      <td className="px-5 py-4 text-gray-800 dark:text-gray-200 font-medium">
                        Rs.{order.totalPrice.toLocaleString()}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                            STATUS_COLORS[order.status] ??
                            "bg-gray-100 text-gray-600 dark:bg-slate-600 dark:text-gray-300"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => deleteOrder(order.orderId)}
                          className="px-3 py-1.5 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {paginatedOrders.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-8 text-center text-gray-400 dark:text-gray-500"
                      >
                        No orders found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Showing {filteredOrders.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}
                –{Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)} of{" "}
                {filteredOrders.length} orders
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[4rem] text-center">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
