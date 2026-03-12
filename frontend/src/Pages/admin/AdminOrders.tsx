import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { normalizeRole } from "../../utils/auth";

interface Order {
  id: number;
  orderId: string;
  grade: string;
  quantity: number;
  totalPrice: number;
  status: string;
  paymentOption?: string;
  creditDays?: number;
  creditApprovalStatus?: string;
  creditDueDate?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  address?: string;
}

interface RawMaterialOrder {
  id: number;
  materialName: string;
  quantity: number;
  unit: string;
  totalPrice: number;
  status: string;
}

type AdminOrderRow = {
  key: string;
  sourceId: number;
  orderId: string;
  itemName: string;
  quantity: number;
  unit: string;
  totalPrice: number;
  status: string;
  orderType: "CONCRETE" | "RAW_MATERIAL";
  rawOrderId?: number;
  paymentOption?: string;
  creditDays?: number;
  creditApprovalStatus?: string;
  creditDueDate?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  address?: string;
};

type FilterKey = "ALL" | "PENDING" | "CREDIT" | "ACTIVE" | "COMPLETED";

const normalizeRawMaterialStatus = (status: string) =>
  (status || "").trim().toUpperCase() === "PENDING_APPROVAL" ? "APPROVED" : status;

const upper = (value?: string) => String(value || "").trim().toUpperCase();

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "INR",
  }).format(Number(value || 0));

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const getOrderApprovalLabel = (order: AdminOrderRow) => {
  const status = upper(order.status);
  if (status === "PENDING_APPROVAL") return "Pending approval";
  if (status === "REJECTED") return "Rejected";
  if (status === "DELIVERED") return "Completed";
  return "Approved";
};

const getCreditApprovalLabel = (order: AdminOrderRow) => {
  if (upper(order.paymentOption) !== "PAY_LATER") return "Not required";
  const creditStatus = upper(order.creditApprovalStatus);
  if (creditStatus === "APPROVED") return `Approved for ${order.creditDays || 0} days`;
  if (creditStatus === "REJECTED") return `Rejected for ${order.creditDays || 0} days`;
  return `Pending for ${order.creditDays || 0} days`;
};

const getBadgeClass = (tone: "success" | "warning" | "danger" | "neutral" | "info") => {
  if (tone === "success") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (tone === "warning") return "bg-amber-50 text-amber-700 border-amber-200";
  if (tone === "danger") return "bg-rose-50 text-rose-700 border-rose-200";
  if (tone === "info") return "bg-sky-50 text-sky-700 border-sky-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

const getLifecycleTone = (status: string) => {
  const normalized = upper(status);
  if (["APPROVED", "IN_PRODUCTION", "DISPATCHED"].includes(normalized)) return "info";
  if (normalized === "DELIVERED") return "success";
  if (normalized === "REJECTED") return "danger";
  if (normalized === "PENDING_APPROVAL") return "warning";
  return "neutral";
};

const isPendingApproval = (order: AdminOrderRow) => order.orderType === "CONCRETE" && upper(order.status) === "PENDING_APPROVAL";
const isPendingCredit = (order: AdminOrderRow) =>
  order.orderType === "CONCRETE" &&
  upper(order.paymentOption) === "PAY_LATER" &&
  upper(order.creditApprovalStatus) === "PENDING";
const isActiveOrder = (order: AdminOrderRow) => ["APPROVED", "IN_PRODUCTION", "DISPATCHED"].includes(upper(order.status));
const isCompletedOrder = (order: AdminOrderRow) => upper(order.status) === "DELIVERED";

const AdminOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("ALL");
  const [confirmOrder, setConfirmOrder] = useState<AdminOrderRow | null>(null);
  const [showMessageBox, setShowMessageBox] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const openMessageBox = (message: string) => {
    setMessageText(message);
    setShowMessageBox(true);
  };

  const fetchOrders = async () => {
    try {
      const [concreteRes, rawRes] = await Promise.all([
        fetch("http://localhost:8080/api/admin/orders"),
        fetch("http://localhost:8080/api/admin/inventory/raw-material-orders"),
      ]);
      const [concreteData, rawData] = await Promise.all([concreteRes.json(), rawRes.json()]);

      const concreteOrders: AdminOrderRow[] = (Array.isArray(concreteData) ? concreteData : []).map(
        (order: Order) => ({
          key: `concrete-${order.orderId}`,
          sourceId: Number(order.id || 0),
          orderId: order.orderId,
          itemName: order.grade,
          quantity: Number(order.quantity || 0),
          unit: "m3",
          totalPrice: Number(order.totalPrice || 0),
          status: order.status || "",
          orderType: "CONCRETE",
          paymentOption: order.paymentOption || "ONLINE",
          creditDays: order.creditDays,
          creditApprovalStatus: order.creditApprovalStatus,
          creditDueDate: order.creditDueDate,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
          address: order.address,
        }),
      );

      const rawOrders: AdminOrderRow[] = (Array.isArray(rawData) ? rawData : []).map(
        (order: RawMaterialOrder) => ({
          key: `raw-${order.id}`,
          sourceId: Number(order.id || 0),
          orderId: `RMO-${order.id}`,
          itemName: order.materialName,
          quantity: Number(order.quantity || 0),
          unit: order.unit || "",
          totalPrice: Number(order.totalPrice || 0),
          status: normalizeRawMaterialStatus(order.status || ""),
          orderType: "RAW_MATERIAL",
          rawOrderId: order.id,
          paymentOption: "STANDARD",
        }),
      );

      setOrders(
        [...concreteOrders, ...rawOrders].sort((a, b) => {
          if (b.sourceId !== a.sourceId) {
            return b.sourceId - a.sourceId;
          }
          return b.key.localeCompare(a.key);
        }),
      );
    } catch (error) {
      console.error("Error fetching orders:", error);
      openMessageBox("Unable to load orders right now.");
    }
  };

  useEffect(() => {
    const role = normalizeRole(localStorage.getItem("role"));
    if (role !== "ADMIN") {
      navigate("/login");
      return;
    }

    void fetchOrders();
  }, [navigate]);

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesQuery =
        !query ||
        (order.orderId || "").toLowerCase().includes(query) ||
        (order.itemName || "").toLowerCase().includes(query) ||
        (order.customerName || "").toLowerCase().includes(query) ||
        (order.customerEmail || "").toLowerCase().includes(query) ||
        (order.customerPhone || "").toLowerCase().includes(query) ||
        (order.status || "").toLowerCase().includes(query) ||
        order.orderType.toLowerCase().includes(query);

      if (!matchesQuery) return false;

      if (activeFilter === "PENDING") return isPendingApproval(order);
      if (activeFilter === "CREDIT") return isPendingCredit(order);
      if (activeFilter === "ACTIVE") return isActiveOrder(order);
      if (activeFilter === "COMPLETED") return isCompletedOrder(order);
      return true;
    });
  }, [activeFilter, orders, searchTerm]);

  const summary = useMemo(
    () => ({
      total: orders.length,
      pending: orders.filter(isPendingApproval).length,
      credit: orders.filter(isPendingCredit).length,
      active: orders.filter(isActiveOrder).length,
      completed: orders.filter(isCompletedOrder).length,
    }),
    [orders],
  );

  const deleteOrder = async (order: AdminOrderRow) => {
    try {
      setIsDeleting(true);
      const res =
        order.orderType === "RAW_MATERIAL" && order.rawOrderId
          ? await fetch(`http://localhost:8080/api/inventory/raw-material-orders/${order.rawOrderId}`, {
              method: "DELETE",
            })
          : await fetch(`http://localhost:8080/api/admin/orders/${encodeURIComponent(order.orderId)}`, {
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

  const runOrderAction = async (order: AdminOrderRow, action: "approveCredit" | "rejectCredit" | "completePayment") => {
    try {
      const endpoint =
        action === "approveCredit"
          ? `http://localhost:8080/api/admin/orders/${encodeURIComponent(order.orderId)}/credit/approve`
          : action === "rejectCredit"
            ? `http://localhost:8080/api/admin/orders/${encodeURIComponent(order.orderId)}/credit/reject`
            : `http://localhost:8080/api/admin/orders/${encodeURIComponent(order.orderId)}/payment/complete`;

      const res = await fetch(endpoint, {
        method: action === "completePayment" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remark: action === "rejectCredit" ? "Credit rejected by admin" : "Credit approved by admin",
        }),
      });

      const raw = await res.text();
      let message = "";
      try {
        const data = JSON.parse(raw);
        message = data.message || "";
      } catch {
        message = raw;
      }

      if (!res.ok) {
        openMessageBox(message || "Request failed");
        return;
      }

      openMessageBox(message || "Updated successfully");
      void fetchOrders();
    } catch (error) {
      console.error(error);
      openMessageBox("Unable to update order.");
    }
  };

  const updateConcreteOrderStatus = async (orderId: string, status: "APPROVED" | "REJECTED" | "DELIVERED") => {
    try {
      const res = await fetch(
        `http://localhost:8080/api/admin/orders/${encodeURIComponent(orderId)}/status?status=${encodeURIComponent(status)}`,
        {
          method: "PUT",
        },
      );
      const raw = await res.text();
      let message = "";
      try {
        const data = JSON.parse(raw);
        message = data.message || "";
      } catch {
        message = raw;
      }
      if (!res.ok) {
        openMessageBox(message || "Unable to update order status");
        return;
      }
      openMessageBox(message || "Order status updated");
      void fetchOrders();
    } catch (error) {
      console.error(error);
      openMessageBox("Unable to update order status.");
    }
  };

  const renderActionButton = (
    key: string,
    label: string,
    className: string,
    onClick: () => void,
    disabled = false,
  ) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {label}
    </button>
  );

  const renderActions = (order: AdminOrderRow) => {
    const status = upper(order.status);
    const paymentOption = upper(order.paymentOption);
    const creditStatus = upper(order.creditApprovalStatus);
    const actions: ReactNode[] = [];

    if (isPendingApproval(order)) {
      actions.push(
        renderActionButton(
          "order-approve",
          "Approve order",
          "bg-emerald-600 text-white hover:bg-emerald-500",
          () => void updateConcreteOrderStatus(order.orderId, "APPROVED"),
        ),
      );
      actions.push(
        renderActionButton(
          "order-reject",
          "Reject order",
          "bg-rose-600 text-white hover:bg-rose-500",
          () => void updateConcreteOrderStatus(order.orderId, "REJECTED"),
        ),
      );
    }

    if (order.orderType === "CONCRETE" && paymentOption === "PAY_LATER" && creditStatus === "PENDING") {
      actions.push(
        renderActionButton(
          "credit-approve",
          "Approve credit",
          "bg-sky-600 text-white hover:bg-sky-500",
          () => void runOrderAction(order, "approveCredit"),
        ),
      );
      actions.push(
        renderActionButton(
          "credit-reject",
          "Reject credit",
          "bg-amber-500 text-white hover:bg-amber-400",
          () => void runOrderAction(order, "rejectCredit"),
        ),
      );
    }

    if (order.orderType === "CONCRETE" && paymentOption === "PAY_LATER" && creditStatus === "REJECTED") {
      actions.push(
        renderActionButton(
          "complete-payment",
          "Mark payment complete",
          "bg-violet-600 text-white hover:bg-violet-500",
          () => void runOrderAction(order, "completePayment"),
        ),
      );
    }

    if (order.orderType === "CONCRETE" && ["APPROVED", "IN_PRODUCTION", "DISPATCHED"].includes(status)) {
      actions.push(
        renderActionButton(
          "scheduled",
          "Open schedule",
          "bg-slate-900 text-white hover:bg-slate-800",
          () => navigate("/admin/schedule", { state: { selectedOrderId: order.orderId } }),
        ),
      );
    }

    if (order.orderType === "CONCRETE" && status !== "DELIVERED" && status !== "REJECTED") {
      actions.push(
        renderActionButton(
          "completed",
          "Mark completed",
          "border border-slate-300 bg-white text-slate-700 hover:border-slate-400",
          () => void updateConcreteOrderStatus(order.orderId, "DELIVERED"),
        ),
      );
    }

    actions.push(
      renderActionButton(
        "delete",
        "Delete",
        "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
        () => setConfirmOrder(order),
        isDeleting,
      ),
    );

    return <div className="flex flex-wrap gap-2">{actions}</div>;
  };

  const filterButtons: Array<{ key: FilterKey; label: string; count: number }> = [
    { key: "ALL", label: "All orders", count: summary.total },
    { key: "PENDING", label: "Pending approval", count: summary.pending },
    { key: "CREDIT", label: "Credit review", count: summary.credit },
    { key: "ACTIVE", label: "Active", count: summary.active },
    { key: "COMPLETED", label: "Completed", count: summary.completed },
  ];

  return (
    <div className="flex min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]">
      <aside className="hidden w-72 shrink-0 bg-slate-950 px-6 py-8 text-white shadow-2xl lg:flex lg:flex-col">
        <h2 className="text-2xl font-bold text-cyan-300">Admin Panel</h2>
        <p className="mt-2 text-sm text-slate-400">Operations dashboard for order review, approvals, and dispatch control.</p>

        <nav className="mt-10 flex flex-col gap-3 text-sm font-medium">
          <button onClick={() => navigate("/admin")} className="rounded-xl px-4 py-3 text-left text-slate-300 transition hover:bg-slate-900 hover:text-white">
            Dashboard
          </button>
          <button onClick={() => navigate("/admin/orders")} className="rounded-xl bg-slate-900 px-4 py-3 text-left text-white">
            Orders
          </button>
          <button onClick={() => navigate("/admin/users")} className="rounded-xl px-4 py-3 text-left text-slate-300 transition hover:bg-slate-900 hover:text-white">
            Users
          </button>
          <button onClick={() => navigate("/admin/adminlogins")} className="rounded-xl px-4 py-3 text-left text-slate-300 transition hover:bg-slate-900 hover:text-white">
            Admin Logins
          </button>
          <button onClick={() => navigate("/admin/schedule")} className="rounded-xl px-4 py-3 text-left text-slate-300 transition hover:bg-slate-900 hover:text-white">
            Schedule
          </button>
          <button onClick={() => navigate("/admin/inventory")} className="rounded-xl px-4 py-3 text-left text-slate-300 transition hover:bg-slate-900 hover:text-white">
            Inventory
          </button>
          <button onClick={() => navigate("/admin/finance")} className="rounded-xl px-4 py-3 text-left text-slate-300 transition hover:bg-slate-900 hover:text-white">
            Finance
          </button>
          <button onClick={() => navigate("/admin/quality-control")} className="rounded-xl px-4 py-3 text-left text-slate-300 transition hover:bg-slate-900 hover:text-white">
            Quality Control
          </button>
          <button onClick={() => navigate("/admin/maintenance")} className="rounded-xl px-4 py-3 text-left text-slate-300 transition hover:bg-slate-900 hover:text-white">
            Maintenance
          </button>
          <button
            onClick={() => {
              localStorage.clear();
              navigate("/login");
            }}
            className="mt-4 rounded-xl px-4 py-3 text-left text-rose-300 transition hover:bg-slate-900 hover:text-rose-200"
          >
            Logout
          </button>
        </nav>
      </aside>

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="grid gap-6 border-b border-slate-100 px-6 py-8 md:grid-cols-[1.7fr_1fr] md:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-600">Order Control</p>
              <h1 className="mt-3 text-3xl font-bold text-slate-900">Admin orders workbench</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Review new orders, approve pay-later requests, track active deliveries, and move each order to scheduling without the clutter.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-slate-900 p-5 text-white">
                <p className="text-xs uppercase tracking-[0.24em] text-white/70">Pending approval</p>
                <p className="mt-2 text-3xl font-bold">{summary.pending}</p>
                <p className="mt-2 text-sm text-white/70">Concrete orders waiting for admin approval.</p>
              </div>
              <div className="rounded-3xl bg-amber-50 p-5 text-slate-900">
                <p className="text-xs uppercase tracking-[0.24em] text-amber-700">Credit review</p>
                <p className="mt-2 text-3xl font-bold">{summary.credit}</p>
                <p className="mt-2 text-sm text-slate-600">Pay later requests needing a decision.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 px-6 py-6 md:grid-cols-3 md:px-8">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Total orders</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{summary.total}</p>
              <p className="mt-2 text-sm text-slate-600">Concrete and raw material orders combined.</p>
            </div>
            <div className="rounded-3xl border border-sky-100 bg-sky-50 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-sky-700">Active flow</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{summary.active}</p>
              <p className="mt-2 text-sm text-slate-600">Approved, production, and dispatched orders.</p>
            </div>
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-emerald-700">Completed</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{summary.completed}</p>
              <p className="mt-2 text-sm text-slate-600">Orders already delivered and closed.</p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Approval queue</h2>
              <p className="mt-1 text-sm text-slate-500">Use quick filters to focus on the work that needs a decision now.</p>
            </div>
            <div className="w-full lg:max-w-sm">
              <input
                type="text"
                placeholder="Search by order, customer, phone or status"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {filterButtons.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeFilter === filter.key
                    ? "bg-slate-900 text-white shadow-lg"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6 space-y-4">
          {filteredOrders.map((order) => (
            <article
              key={order.key}
              className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)]"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white">
                      {order.orderType === "RAW_MATERIAL" ? "Raw Material" : "Concrete"}
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getBadgeClass(getLifecycleTone(order.status))}`}>
                      {String(order.status || "UNKNOWN").replaceAll("_", " ")}
                    </span>
                  </div>
                  <h3 className="mt-3 text-2xl font-bold text-slate-900">{order.orderId}</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {order.itemName} | {order.quantity} {order.unit} | {formatCurrency(order.totalPrice)}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[520px]">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Order approval</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{getOrderApprovalLabel(order)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Payment</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {(order.paymentOption || "STANDARD").replaceAll("_", " ")}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Credit approval</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{getCreditApprovalLabel(order)}</p>
                    {order.creditDueDate ? (
                      <p className="mt-2 text-xs text-slate-500">Due {formatDate(order.creditDueDate)}</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Customer details</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-slate-500">Customer</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{order.customerName || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Phone</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{order.customerPhone || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Email</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 break-all">{order.customerEmail || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Address</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{order.address || "-"}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#eef2ff_100%)] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Admin actions</p>
                  <div className="mt-4">{renderActions(order)}</div>
                </div>
              </div>
            </article>
          ))}

          {filteredOrders.length === 0 && (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 p-10 text-center shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">No matching orders</h3>
              <p className="mt-2 text-sm text-slate-500">Try a different search term or switch to another filter.</p>
            </div>
          )}
        </section>
      </main>

      {confirmOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-slate-900">Delete order</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This will remove <span className="font-semibold text-slate-900">{confirmOrder.orderId}</span> from the system. Continue only if this order should be deleted permanently.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmOrder(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetOrder = confirmOrder;
                  setConfirmOrder(null);
                  if (targetOrder) {
                    void deleteOrder(targetOrder);
                  }
                }}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500"
              >
                Delete order
              </button>
            </div>
          </div>
        </div>
      )}

      {showMessageBox && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-slate-900">Update</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{messageText}</p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowMessageBox(false)}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
