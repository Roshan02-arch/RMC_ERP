import { useState, useContext } from "react";
import { Outlet, NavLink } from "react-router-dom";
import {
  Home,
  LayoutDashboard,
  ShoppingCart,
  Truck,
  CreditCard,
  Shield,
  Menu,
  X,
} from "lucide-react";
import { ThemeContext } from "../utils/ThemeContext";
import Navbar from "./Navbar";

const navItems = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/purchaseproduct", label: "Purchase Product", icon: ShoppingCart },
  { to: "/delivery-tracking", label: "Delivery Tracking", icon: Truck },
  { to: "/billing-payment", label: "Billing & Payment", icon: CreditCard },
  { to: "/quality-access", label: "Quality Access", icon: Shield },
] as const;

const CustomerLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { darkMode } = useContext(ThemeContext);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? "bg-indigo-600 text-white"
        : "text-slate-300 hover:bg-slate-800 hover:text-white"
    }`;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-5">
        <span className="text-xl font-bold text-white tracking-wide">
          RMC ERP
        </span>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden text-slate-400 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={linkClass}
            onClick={() => setSidebarOpen(false)}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-slate-700 text-xs text-slate-500">
        {darkMode ? "Dark" : "Light"} Mode Active
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:flex-shrink-0 bg-slate-900">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape" || e.key === "Enter" || e.key === " ")
              setSidebarOpen(false);
          }}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 transform transition-transform duration-200 ease-in-out lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center lg:hidden px-4 pt-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            aria-label="Open sidebar"
          >
            <Menu size={24} />
          </button>
        </div>

        <Navbar />

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default CustomerLayout;
