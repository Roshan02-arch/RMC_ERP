import { NavLink, Outlet, useNavigate } from "react-router-dom";

const menuItems = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/credit-orders", label: "Approval Page" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/adminlogins", label: "Admin Logins" },
  { to: "/admin/schedule", label: "Schedule" },
  { to: "/admin/inventory", label: "Inventory" },
  { to: "/admin/finance", label: "Finance" },
  { to: "/admin/quality-control", label: "Quality Control" },
  { to: "/admin/maintenance", label: "Maintenance" },
];

const AdminLayout = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-64 bg-slate-900 text-white flex flex-col p-6 space-y-8">
        <h2 className="text-2xl font-bold text-indigo-400">Admin Panel</h2>

        <nav className="flex flex-col space-y-4 text-sm">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `text-left transition ${isActive ? "text-indigo-300" : "hover:text-indigo-400"}`
              }
            >
              {item.label}
            </NavLink>
          ))}

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

      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-gray-200 bg-white px-6 flex items-center">
          <h1 className="text-lg font-semibold text-gray-800">Admin Panel</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="admin-outlet-root">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
