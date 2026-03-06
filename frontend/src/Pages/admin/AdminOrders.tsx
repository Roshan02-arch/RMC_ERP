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
  Search,
  Menu,
  X,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Download,
  ArrowUpDown,
  PackageOpen,
} from "lucide-react";
import { ThemeContext } from "../../App";

interface Order {
  id: number;
  orderId: string;
  grade: string;
  quantity: number;
  totalPrice: number;
  status: string;
}

const ITEMS_PER_PAGE = 10;

const STATUS_OPTIONS = ["All", "PENDING_APPROVAL", "APPROVED", "REJECTED", "DELIVERED"] as const;

const STATUS_COLORS: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  DELIVERED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const NAV_ITEMS = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { label: "Orders", path: "/admin/orders", icon: Package },
  { label: "Users", path: "/admin/users", icon: Users },
  { label: "Admin Logins", path: "/admin/adminlogins", icon: Shield },
  { label: "Schedule", path: "/admin/schedule", icon: Calendar },
  { label: "Inventory", path: "/admin/inventory", icon: Warehouse },
];

type SortKey = "orderId" | "grade" | "quantity" | "totalPrice" | "status";

const AdminOrders = () => {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("orderId");
  const [sortAsc, setSortAsc] = useState(true);

  const fetchOrders = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/admin/orders");
      const data: unknown = await res.json();
      setOrders(Array.isArray(data) ? (data as Order[]) : []);
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
        const data: unknown = await res.json();
        if (mounted) {
          setOrders(Array.isArray(data) ? (data as Order[]) : []);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return orders.filter((order) => {
      if (statusFilter !== "All" && order.status !== statusFilter) return false;
      if (!query) return true;
      return (
        (order.orderId || "").toLowerCase().includes(query) ||
        (order.grade || "").toLowerCase().includes(query) ||
        String(order.quantity ?? "").toLowerCase().includes(query) ||
        String(order.totalPrice ?? "").toLowerCase().includes(query) ||
        (order.status || "").toLowerCase().includes(query)
      );
    });
  }, [orders, searchTerm, statusFilter]);

  const sortedOrders = useMemo(() => {
    const sorted = [...filteredOrders].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "number" && typeof bVal === "number") return aVal - bVal;
      return String(aVal).localeCompare(String(bVal));
    });
    return sortAsc ? sorted : sorted.reverse();
  }, [filteredOrders, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / ITEMS_PER_PAGE));
  const paginatedOrders = sortedOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const deleteOrder = async (orderId: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this order?");
    if (!confirmed) return;

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
          if (raw) message = raw;
        }
        alert(message);
        return;
      }

      void fetchOrders();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const exportOrders = () => {
    const headers = ["Order ID", "Grade", "Quantity", "Total Price", "Status"];
    const rows = sortedOrders.map((o) => [o.orderId, o.grade, o.quantity, o.totalPrice, o.status]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "orders.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Stats
  const totalCount = orders.length;
  const pendingCount = orders.filter((o) => o.status === "PENDING_APPROVAL").length;
  const approvedCount = orders.filter((o) => o.status === "APPROVED").length;
  const rejectedCount = orders.filter((o) => o.status === "REJECTED").length;

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      className="px-6 py-4 text-left cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown size={14} className={sortKey === field ? "text-blue-500" : "opacity-40"} />
      </span>
    </th>
  );

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

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = item.path === "/admin/orders";
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
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Order Management
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  <span className="text-gray-400 dark:text-gray-500">Admin</span>
                  {" / "}
                  <span className="text-blue-600 dark:text-blue-400">Orders</span>
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-md">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-md">
              <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {pendingCount}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-md">
              <p className="text-xs text-gray-500 dark:text-gray-400">Approved</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {approvedCount}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-md">
              <p className="text-xs text-gray-500 dark:text-gray-400">Rejected</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{rejectedCount}</p>
            </div>
          </div>

          {/* Filter bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
              />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === "All" ? "All Statuses" : s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <button
              onClick={exportOrders}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Download size={16} />
              Export
            </button>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-700/50 text-gray-600 dark:text-gray-300 uppercase text-xs tracking-wider">
                    <SortHeader label="Order ID" field="orderId" />
                    <SortHeader label="Grade" field="grade" />
                    <SortHeader label="Quantity" field="quantity" />
                    <SortHeader label="Total" field="totalPrice" />
                    <SortHeader label="Status" field="status" />
                    <th className="px-6 py-4 text-left">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {paginatedOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-700/40 transition"
                    >
                      <td className="px-6 py-4 font-medium text-gray-800 dark:text-gray-200">
                        {order.orderId}
                      </td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{order.grade}</td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                        {order.quantity} m³
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">
                        Rs.{order.totalPrice.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            STATUS_COLORS[order.status] ??
                            "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {order.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => deleteOrder(order.orderId)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {paginatedOrders.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-16 text-center text-gray-500 dark:text-gray-400"
                      >
                        <PackageOpen
                          size={48}
                          className="mx-auto mb-3 text-gray-300 dark:text-gray-600"
                        />
                        <p className="text-base font-medium">No orders found</p>
                        <p className="text-sm mt-1">
                          Try adjusting your search or filter criteria.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {sortedOrders.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-slate-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                  {Math.min(currentPage * ITEMS_PER_PAGE, sortedOrders.length)} of{" "}
                  {sortedOrders.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminOrders;
