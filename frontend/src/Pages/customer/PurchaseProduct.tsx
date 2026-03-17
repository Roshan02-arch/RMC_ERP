import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiBell } from "react-icons/fi";
import { toast } from "react-toastify";
import { normalizeRole } from "../../utils/auth";
import { useCenteredDialog } from "../../hooks/useCenteredDialog";

type OrderStatus =
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "IN_PRODUCTION"
  | "DISPATCHED"
  | "DELIVERED"
  | "REJECTED";

interface ConcreteOrder {
  id: number;
  orderId: string;
  grade: string;
  quantity: number;
  totalPrice: number;
  status: OrderStatus;
  paymentOption?: string;
  creditApprovalStatus?: string;
  creditDays?: number;
}

type ProductStock = {
  id: number;
  name: string;
  pricePerUnit: number;
  availableQuantity: number;
  unit: string;
  createdAt: string;
};

type RawMaterial = {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  supplier: string;
  pricePerUnit: number;
  reorderLevel: number;
};

type RawMaterialOrder = {
  id: number;
  materialName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  address: string;
  status: string;
  createdAt: string;
};

type CartItem = {
  key: string;
  itemType: "concrete" | "material";
  id: number;
  name: string;
  unit: string;
  quantity: number;
  pricePerUnit: number;
};

const isNewStock = (createdAt: string) =>
  Date.now() - new Date(createdAt).getTime() < 15 * 60 * 1000;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDateTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const parseReminderIds = (rawValue: string | null) => {
  if (!rawValue) return [];
  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
  } catch {
    return [];
  }
};

const PurchaseProduct = () => {
  const navigate = useNavigate();
  const { showConfirm, showMessage, dialogNode } = useCenteredDialog();
  const currentUserId = localStorage.getItem("userId") || "guest";
  const reminderStorageKey = `restock_reminders_${currentUserId}`;
  const [selectedTab, setSelectedTab] = useState<"concrete" | "material">("concrete");
  const [error, setError] = useState("");

  const [orders, setOrders] = useState<ConcreteOrder[]>([]);
  const [materialOrders, setMaterialOrders] = useState<RawMaterialOrder[]>([]);
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);

  const [productQtyMap, setProductQtyMap] = useState<Record<number, number>>({});
  const [materialQtyMap, setMaterialQtyMap] = useState<Record<number, number>>({});
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null);
  const [restockReminderIds, setRestockReminderIds] = useState<number[]>(() =>
    parseReminderIds(localStorage.getItem(reminderStorageKey))
  );
  const previousProductQtyRef = useRef<Record<number, number>>({});

  const isReminderEnabled = (productId: number) => restockReminderIds.includes(productId);

  const toggleRestockReminder = async (product: ProductStock) => {
    if (product.availableQuantity > 0) {
      return;
    }

    const alreadyEnabled = restockReminderIds.includes(product.id);
    if (alreadyEnabled) {
      setRestockReminderIds((prev) => prev.filter((id) => id !== product.id));
      toast.info(`Reminder removed for ${product.name}`);
      return;
    }

    setRestockReminderIds((prev) => [...prev, product.id]);
    toast.success(`Reminder set for ${product.name}`);

    if ("Notification" in window && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {
        // Ignore permission errors and continue with in-app reminders.
      }
    }
  };

  const getStoredCart = () => {
    try {
      const raw = localStorage.getItem("checkout_cart");
      const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const saveCart = (cart: CartItem[]) => {
    localStorage.setItem("checkout_cart", JSON.stringify(cart));
  };

  const addConcreteToCart = (product: ProductStock) => {
    setError("");
    const qty = Number(productQtyMap[product.id] || 1);
    if (qty <= 0) {
      setError("Enter valid quantity.");
      return;
    }
    if (product.availableQuantity <= 0 || qty > product.availableQuantity) {
      setError(`Only ${product.availableQuantity} ${product.unit} available for ${product.name}.`);
      return;
    }

    const key = `concrete-${product.id}`;
    const existingCart = getStoredCart();
    const existing = existingCart.find((item) => item.key === key);
    let nextCart: CartItem[];
    if (existing) {
      const nextQty = existing.quantity + qty;
      if (nextQty > product.availableQuantity) {
        setError(`Cart limit exceeded. Max ${product.availableQuantity} ${product.unit}.`);
        return;
      }
      nextCart = existingCart.map((item) => (item.key === key ? { ...item, quantity: nextQty } : item));
    } else {
      nextCart = [
        ...existingCart,
        {
          key,
          itemType: "concrete",
          id: product.id,
          name: product.name,
          quantity: qty,
          unit: product.unit,
          pricePerUnit: product.pricePerUnit,
        },
      ];
    }

    saveCart(nextCart);
    toast.success("Product added to cart successfully");
  };

  const addMaterialToCart = (material: RawMaterial) => {
    setError("");
    const qty = Number(materialQtyMap[material.id] || 1);
    if (qty <= 0) {
      setError("Enter valid quantity.");
      return;
    }
    if (material.quantity <= 0 || qty > material.quantity) {
      setError(`Only ${material.quantity} ${material.unit} available for ${material.name}.`);
      return;
    }

    const key = `material-${material.id}`;
    const existingCart = getStoredCart();
    const existing = existingCart.find((item) => item.key === key);
    let nextCart: CartItem[];
    if (existing) {
      const nextQty = existing.quantity + qty;
      if (nextQty > material.quantity) {
        setError(`Cart limit exceeded. Max ${material.quantity} ${material.unit}.`);
        return;
      }
      nextCart = existingCart.map((item) => (item.key === key ? { ...item, quantity: nextQty } : item));
    } else {
      nextCart = [
        ...existingCart,
        {
          key,
          itemType: "material",
          id: material.id,
          name: material.name,
          quantity: qty,
          unit: material.unit,
          pricePerUnit: material.pricePerUnit || 0,
        },
      ];
    }

    saveCart(nextCart);
    toast.success("Product added to cart successfully");
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/inventory/products");
      const data: ProductStock[] = await response.json();
      const items = Array.isArray(data) ? data : [];
      setProducts(items);

      if (restockReminderIds.length > 0) {
        const reminderSet = new Set(restockReminderIds);
        const restockedIds: number[] = [];
        const restockedNames: string[] = [];

        items.forEach((product) => {
          const previousQty = previousProductQtyRef.current[product.id];
          const becameAvailable = product.availableQuantity > 0 && (previousQty === undefined || previousQty <= 0);
          if (reminderSet.has(product.id) && becameAvailable) {
            restockedIds.push(product.id);
            restockedNames.push(product.name);
          }
        });

        if (restockedIds.length > 0) {
          toast.success(`${restockedNames.join(", ")} restocked`);
          if ("Notification" in window && Notification.permission === "granted") {
            try {
              new Notification("RMC ERP Restock Alert", {
                body: `${restockedNames.join(", ")} is back in stock.`,
              });
            } catch {
              // Continue with in-app toast if browser notification fails.
            }
          }
          setRestockReminderIds((prev) => prev.filter((id) => !restockedIds.includes(id)));
        }
      }

      previousProductQtyRef.current = Object.fromEntries(
        items.map((product) => [product.id, product.availableQuantity])
      );
    } catch (e) {
      console.error("Unable to load products", e);
    }
  };

  const fetchMaterials = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/inventory/raw-materials");
      const data: RawMaterial[] = await response.json();
      setMaterials(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Unable to load raw materials", e);
    }
  };

  const fetchConcreteOrders = async (userId: string) => {
    const response = await fetch(`http://localhost:8080/api/orders/my-orders/${userId}`);
    if (!response.ok) throw new Error("Failed to fetch order history");
    const data: ConcreteOrder[] = await response.json();
    const items = Array.isArray(data) ? data : [];
    items.sort((a, b) => b.id - a.id);
    setOrders(items);
  };

  const fetchRawMaterialOrders = async (userId: string) => {
    try {
      const response = await fetch(`http://localhost:8080/api/inventory/raw-material-orders/${userId}`);
      if (!response.ok) {
        setMaterialOrders([]);
        return;
      }
      const data: RawMaterialOrder[] = await response.json();
      setMaterialOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Unable to load raw material orders", e);
    }
  };

  useEffect(() => {
    localStorage.setItem(reminderStorageKey, JSON.stringify(restockReminderIds));
  }, [reminderStorageKey, restockReminderIds]);

  useEffect(() => {
    const role = normalizeRole(localStorage.getItem("role"));
    const userId = localStorage.getItem("userId");
    if (role !== "CUSTOMER" || !userId) {
      setOrders([]);
      setMaterialOrders([]);
      return;
    }

    void fetchConcreteOrders(userId);
    void fetchRawMaterialOrders(userId);
    void fetchProducts();
    void fetchMaterials();
  }, []);

  useEffect(() => {
    if (restockReminderIds.length === 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void fetchProducts();
    }, 20000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [restockReminderIds]);

  const deleteConcreteOrder = async (order: ConcreteOrder) => {
    if (!(await showConfirm(`Delete order ${order.orderId}?`, "Confirm Delete", "Delete"))) return;
    try {
      setDeletingOrderId(order.id);
      let response: Response;
      if (order.orderId) {
        response = await fetch(`http://localhost:8080/api/admin/orders/${encodeURIComponent(order.orderId)}`, {
          method: "DELETE",
        });
      } else {
        response = await fetch(`http://localhost:8080/api/orders/${order.id}`, { method: "DELETE" });
      }

      // Fallback for older API behavior that deletes by numeric id.
      if (!response.ok && order.id) {
        response = await fetch(`http://localhost:8080/api/orders/${order.id}`, { method: "DELETE" });
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        await showMessage(payload?.message || "Unable to delete order");
        return;
      }
      setOrders((prev) => prev.filter((item) => item.id !== order.id && item.orderId !== order.orderId));
      await showMessage("Order deleted successfully.");
    } finally {
      setDeletingOrderId(null);
    }
  };

  const deleteMaterialOrder = async (order: RawMaterialOrder) => {
    if (!(await showConfirm(`Delete raw material order #${order.id}?`, "Confirm Delete", "Delete"))) return;
    const response = await fetch(`http://localhost:8080/api/inventory/raw-material-orders/${order.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      await showMessage("Unable to delete raw material order");
      return;
    }
    setMaterialOrders((prev) => prev.filter((item) => item.id !== order.id));
    await showMessage("Raw material order deleted.");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe_0%,#f8fafc_32%,#eef2ff_100%)]">
      <div className="px-4 pb-10 pt-24 sm:px-6">
        <div className="mx-auto w-full max-w-7xl space-y-8">
          <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#38bdf8_100%)] p-8 text-white shadow-[0_28px_70px_rgba(15,23,42,0.22)] sm:p-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">

                <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Smart Ordering Desk</h1>

              </div>

              <div className="flex flex-wrap gap-3">
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-blue-100/75">Concrete Mixes</p>
                  <p className="mt-1 text-2xl font-bold">{products.length}</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-blue-100/75">Raw Materials</p>
                  <p className="mt-1 text-2xl font-bold">{materials.length}</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-blue-100/75">Total Orders</p>
                  <p className="mt-1 text-2xl font-bold">{orders.length + materialOrders.length}</p>
                </div>
              </div>
            </div>
          </section>

          <div className="rounded-[30px] border border-slate-200 bg-white/95 p-6 shadow-[0_20px_55px_rgba(15,23,42,0.10)] backdrop-blur-sm sm:p-8">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">RMC Store</p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Choose what you want to order</h2>
                <p className="mt-2 text-sm text-slate-500">Switch between ready-mix concrete and raw materials, then add your required quantity to the cart.</p>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <button
                  type="button"
                  onClick={() => navigate("/checkout-payment")}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition hover:bg-slate-800"
                >
                  Go To Cart
                </button>
              </div>
            </div>

            <div className="mb-6 inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                className={`rounded-2xl px-5 py-2.5 text-sm font-semibold transition ${
                  selectedTab === "concrete" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setSelectedTab("concrete")}
              >
                Mix Concrete
              </button>
              <button
                type="button"
                className={`rounded-2xl px-5 py-2.5 text-sm font-semibold transition ${
                  selectedTab === "material" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setSelectedTab("material")}
              >
                Raw Materials
              </button>
            </div>

            {error && <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

            {selectedTab === "concrete" ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {products.map((p) => (
                  <div key={p.id} className="group rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_35px_rgba(15,23,42,0.10)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-bold text-slate-900">{p.name}</p>
                        <p className="mt-1 text-sm text-slate-500">Ready mix concrete</p>
                      </div>
                      {isNewStock(p.createdAt) && (
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                          New
                        </span>
                      )}
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Rate</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(p.pricePerUnit)} / {p.unit}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Available</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{p.availableQuantity} {p.unit}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${p.availableQuantity > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                        {p.availableQuantity > 0 ? "In Stock" : "Out of Stock"}
                      </span>
                    </div>

                    <div className="mt-5 flex items-center gap-3">
                      <input
                        type="number"
                        min={1}
                        value={productQtyMap[p.id] ?? 1}
                        onChange={(e) =>
                          setProductQtyMap((prev) => ({ ...prev, [p.id]: Number(e.target.value) || 1 }))
                        }
                        className="w-24 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      />
                      <button
                        type="button"
                        onClick={() => addConcreteToCart(p)}
                        disabled={p.availableQuantity <= 0}
                        className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                      >
                        {p.availableQuantity <= 0 ? "Out of Stock" : "Add to Cart"}
                      </button>
                    </div>

                    {p.availableQuantity <= 0 && (
                      <button
                        type="button"
                        onClick={() => void toggleRestockReminder(p)}
                        className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                          isReminderEnabled(p.id)
                            ? "border-amber-300 bg-amber-50 text-amber-700"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <FiBell />
                        {isReminderEnabled(p.id) ? "Reminder Set" : "Notify Me"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {materials.map((m) => (
                  <div key={m.id} className="group rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_35px_rgba(15,23,42,0.10)]">
                    <div>
                      <p className="text-lg font-bold text-slate-900">{m.name}</p>
                      <p className="mt-1 text-sm text-slate-500">Supplier: {m.supplier || "-"}</p>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Rate</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(m.pricePerUnit)} / {m.unit}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Available</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{m.quantity} {m.unit}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${m.quantity > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                        {m.quantity > 0 ? "In Stock" : "Out of Stock"}
                      </span>
                    </div>

                    <div className="mt-5 flex items-center gap-3">
                      <input
                        type="number"
                        min={1}
                        value={materialQtyMap[m.id] ?? 1}
                        onChange={(e) =>
                          setMaterialQtyMap((prev) => ({ ...prev, [m.id]: Number(e.target.value) || 1 }))
                        }
                        className="w-24 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      />
                      <button
                        type="button"
                        onClick={() => addMaterialToCart(m)}
                        disabled={m.quantity <= 0}
                        className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                      >
                        {m.quantity <= 0 ? "Out of Stock" : "Add to Cart"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <section className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-[30px] border border-slate-200 bg-white/95 p-6 shadow-[0_20px_55px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-8">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">Recent Orders</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">Concrete Order History</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{orders.length} orders</span>
              </div>

              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 transition hover:border-slate-300 hover:bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">{order.orderId}</p>
                        <p className="mt-2 text-lg font-bold text-slate-900">{order.grade}</p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {order.status.replaceAll("_", " ")}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
                      <p><span className="font-semibold text-slate-900">Quantity:</span> {order.quantity} m3</p>
                      <p><span className="font-semibold text-slate-900">Total:</span> {formatCurrency(order.totalPrice)}</p>
                    </div>

                    {String(order.paymentOption || "").toUpperCase() === "PAY_LATER" && (
                      <p className="mt-3 text-sm text-slate-600">
                        <span className="font-semibold text-slate-900">Credit:</span> {(order.creditApprovalStatus || "PENDING").replaceAll("_", " ")}
                        {order.creditDays ? ` (${order.creditDays} days)` : ""}
                      </p>
                    )}

                    <button
                      onClick={() => deleteConcreteOrder(order)}
                      disabled={deletingOrderId === order.id}
                      className="mt-4 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-60"
                    >
                      {deletingOrderId === order.id ? "Deleting..." : "Delete Order"}
                    </button>
                  </div>
                ))}
                {orders.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    No concrete orders yet.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white/95 p-6 shadow-[0_20px_55px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-8">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">Recent Orders</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">Raw Material Order History</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{materialOrders.length} orders</span>
              </div>

              <div className="space-y-4">
                {materialOrders.map((order) => (
                  <div key={order.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5 transition hover:border-slate-300 hover:bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-bold text-slate-900">{order.materialName}</p>
                        <p className="mt-1 text-sm text-slate-500">{formatDateTime(order.createdAt)}</p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {order.status}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      <p><span className="font-semibold text-slate-900">Quantity:</span> {order.quantity} {order.unit}</p>
                      <p><span className="font-semibold text-slate-900">Price:</span> {formatCurrency(order.pricePerUnit)} / {order.unit}</p>
                      <p><span className="font-semibold text-slate-900">Total:</span> {formatCurrency(order.totalPrice)}</p>
                      <p><span className="font-semibold text-slate-900">Address:</span> {order.address}</p>
                    </div>

                    <button
                      onClick={() => deleteMaterialOrder(order)}
                      className="mt-4 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500"
                    >
                      Delete Raw Material Order
                    </button>
                  </div>
                ))}
                {materialOrders.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    No raw material orders yet.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
      {dialogNode}
    </div>
  );
};

export default PurchaseProduct;
