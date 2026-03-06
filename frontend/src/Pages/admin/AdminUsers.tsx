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
  UserX,
} from "lucide-react";
import { ThemeContext } from "../../utils/ThemeContext";

interface User {
  id: number;
  name: string;
  email: string;
  number: string;
  role: string;
}

const ITEMS_PER_PAGE = 10;

const ROLE_OPTIONS = ["All", "ADMIN", "CUSTOMER"] as const;

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  CUSTOMER: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const NAV_ITEMS = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { label: "Orders", path: "/admin/orders", icon: Package },
  { label: "Users", path: "/admin/users", icon: Users },
  { label: "Admin Logins", path: "/admin/adminlogins", icon: Shield },
  { label: "Schedule", path: "/admin/schedule", icon: Calendar },
  { label: "Inventory", path: "/admin/inventory", icon: Warehouse },
];

const AdminUsers = () => {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "ADMIN") {
      navigate("/login");
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const res = await fetch("http://localhost:8080/api/admin/users");
        const data: unknown = await res.json();
        if (mounted) {
          setUsers(Array.isArray(data) ? (data as User[]) : []);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== "All" && user.role !== roleFilter) return false;
      if (!query) return true;
      return (
        (user.name || "").toLowerCase().includes(query) ||
        (user.email || "").toLowerCase().includes(query) ||
        (user.number || "").toLowerCase().includes(query) ||
        (user.role || "").toLowerCase().includes(query)
      );
    });
  }, [users, searchTerm, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // Counts
  const totalCount = users.length;
  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const customerCount = users.filter((u) => u.role === "CUSTOMER").length;

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
            const isActive = item.path === "/admin/users";
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
                  User Management
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  <span className="text-gray-400 dark:text-gray-500">Admin</span>
                  {" / "}
                  <span className="text-blue-600 dark:text-blue-400">Users</span>
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* User count badges */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-md">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-md">
              <p className="text-xs text-gray-500 dark:text-gray-400">Admins</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {adminCount}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-md">
              <p className="text-xs text-gray-500 dark:text-gray-400">Customers</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {customerCount}
              </p>
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
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r === "All" ? "All Roles" : r}
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-700/50 text-gray-600 dark:text-gray-300 uppercase text-xs tracking-wider">
                    <th className="px-6 py-4 text-left">Name</th>
                    <th className="px-6 py-4 text-left">Email</th>
                    <th className="px-6 py-4 text-left">Mobile</th>
                    <th className="px-6 py-4 text-left">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {paginatedUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-700/40 transition"
                    >
                      <td className="px-6 py-4 font-medium text-gray-800 dark:text-gray-200">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{user.email}</td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{user.number}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            ROLE_COLORS[user.role] ??
                            "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {paginatedUsers.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-16 text-center text-gray-500 dark:text-gray-400"
                      >
                        <UserX
                          size={48}
                          className="mx-auto mb-3 text-gray-300 dark:text-gray-600"
                        />
                        <p className="text-base font-medium">No users found</p>
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
            {filteredUsers.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-slate-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} of{" "}
                  {filteredUsers.length}
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

export default AdminUsers;
