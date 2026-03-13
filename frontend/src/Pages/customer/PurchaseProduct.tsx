import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiBell } from "react-icons/fi";
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
  const [toast, setToast] = useState("");

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

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 1500);
  };

  const isReminderEnabled = (productId: number) => restockReminderIds.includes(productId);

  const toggleRestockReminder = async (product: ProductStock) => {
    if (product.availableQuantity > 0) {
      return;
    }

    const alreadyEnabled = restockReminderIds.includes(product.id);
    if (alreadyEnabled) {
      setRestockReminderIds((prev) => prev.filter((id) => id !== product.id));
      showToast(`Reminder removed for ${product.name}`);
      return;
    }

    setRestockReminderIds((prev) => [...prev, product.id]);
    showToast(`Reminder set for ${product.name}`);

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
    showToast(`${product.name} added to cart`);
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
    showToast(`${material.name} added to cart`);
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
          showToast(`${restockedNames.join(", ")} restocked`);
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
    <div className="min-h-screen bg-gray-100">
      <div className="flex items-center justify-center p-6 pt-24">
        <div className="w-full max-w-7xl bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <h2 className="text-2xl font-bold text-gray-800">RMC Store</h2>
            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={() => navigate("/checkout-payment")}
                className="px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-semibold"
              >
                Go To Cart
              </button>
              {toast && (
                <div className="rounded-lg bg-green-600 text-white px-4 py-2 text-sm font-semibold">
                  {toast}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-1 flex w-fit mb-6">
            <button
              type="button"
              className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                selectedTab === "concrete" ? "bg-gray-900 text-white" : "text-gray-700"
              }`}
              onClick={() => setSelectedTab("concrete")}
            >
              Mix Concrete
            </button>
            <button
              type="button"
              className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                selectedTab === "material" ? "bg-gray-900 text-white" : "text-gray-700"
              }`}
              onClick={() => setSelectedTab("material")}
            >
              Raw Materials
            </button>
          </div>

          {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}

          {selectedTab === "concrete" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {products.map((p) => (
                <div key={p.id} className="border border-gray-200 rounded-xl bg-white">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-gray-900">{p.name}</p>
                      {isNewStock(p.createdAt) && (
                        <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Rs.{p.pricePerUnit} / {p.unit}</p>
                    <p className="text-xs text-gray-500 mt-1">Available: {p.availableQuantity} {p.unit}</p>
                    <p className={`text-xs font-semibold mt-1 ${p.availableQuantity > 0 ? "text-green-600" : "text-red-600"}`}>
                      {p.availableQuantity > 0 ? "in stock" : "out of stock"}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={productQtyMap[p.id] ?? 1}
                        onChange={(e) =>
                          setProductQtyMap((prev) => ({ ...prev, [p.id]: Number(e.target.value) || 1 }))
                        }
                        className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => addConcreteToCart(p)}
                        disabled={p.availableQuantity <= 0}
                        className="flex-1 px-4 py-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold disabled:opacity-60"
                      >
                        {p.availableQuantity <= 0 ? "Out of Stock" : "Add to Cart"}
                      </button>
                    </div>
                    {p.availableQuantity <= 0 && (
                      <button
                        type="button"
                        onClick={() => void toggleRestockReminder(p)}
                        className={`mt-2 w-full px-4 py-2 rounded-lg border text-sm font-semibold transition inline-flex items-center justify-center gap-2 ${
                          isReminderEnabled(p.id)
                            ? "border-amber-300 bg-amber-50 text-amber-700"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <FiBell />
                        {isReminderEnabled(p.id) ? "Reminder Set" : "Notify Me"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {materials.map((m) => (
                <div key={m.id} className="border border-gray-200 rounded-xl bg-white">
                  <div className="p-4">
                    <p className="font-semibold text-gray-900">{m.name}</p>
                    <p className="text-sm text-gray-600 mt-1">Supplier: {m.supplier || "-"}</p>
                    <p className="text-sm text-gray-600 mt-1">Rs.{m.pricePerUnit} / {m.unit}</p>
                    <p className="text-xs text-gray-500 mt-1">Available: {m.quantity} {m.unit}</p>
                    <p className={`text-xs font-semibold mt-1 ${m.quantity > 0 ? "text-green-600" : "text-red-600"}`}>
                      {m.quantity > 0 ? "in stock" : "out of stock"}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={materialQtyMap[m.id] ?? 1}
                        onChange={(e) =>
                          setMaterialQtyMap((prev) => ({ ...prev, [m.id]: Number(e.target.value) || 1 }))
                        }
                        className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => addMaterialToCart(m)}
                        disabled={m.quantity <= 0}
                        className="flex-1 px-4 py-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold disabled:opacity-60"
                      >
                        {m.quantity <= 0 ? "Out of Stock" : "Add to Cart"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="my-10 border-t border-gray-200" />

          <h2 className="text-xl font-semibold text-gray-800 mb-4">Concrete Order History</h2>
          <div className="space-y-4 mb-10">
            {orders.map((order) => (
              <div key={order.id} className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                <p className="text-sm"><strong>Order ID:</strong> {order.orderId}</p>
                <p className="text-sm"><strong>Product:</strong> {order.grade}</p>
                <p className="text-sm"><strong>Quantity:</strong> {order.quantity} m3</p>
                <p className="text-sm"><strong>Total:</strong> Rs.{order.totalPrice}</p>
                <p className="text-sm"><strong>Status:</strong> {order.status.replaceAll("_", " ")}</p>
                {String(order.paymentOption || "").toUpperCase() === "PAY_LATER" && (
                  <p className="text-sm">
                    <strong>Credit:</strong> {(order.creditApprovalStatus || "PENDING").replaceAll("_", " ")}
                    {order.creditDays ? ` (${order.creditDays} days)` : ""}
                  </p>
                )}
                <button
                  onClick={() => deleteConcreteOrder(order)}
                  disabled={deletingOrderId === order.id}
                  className="mt-3 px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 text-white text-sm font-medium disabled:opacity-60"
                >
                  {deletingOrderId === order.id ? "Deleting..." : "Delete Order"}
                </button>
              </div>
            ))}
          </div>

          <h2 className="text-xl font-semibold text-gray-800 mb-4">Raw Material Order History</h2>
          <div className="space-y-4">
            {materialOrders.map((order) => (
              <div key={order.id} className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                <p className="text-sm"><strong>Material:</strong> {order.materialName}</p>
                <p className="text-sm"><strong>Quantity:</strong> {order.quantity} {order.unit}</p>
                <p className="text-sm"><strong>Price:</strong> Rs.{order.pricePerUnit} / {order.unit}</p>
                <p className="text-sm"><strong>Total:</strong> Rs.{order.totalPrice}</p>
                <p className="text-sm"><strong>Address:</strong> {order.address}</p>
                <p className="text-sm"><strong>Date:</strong> {new Date(order.createdAt).toLocaleString()}</p>
                <button
                  onClick={() => deleteMaterialOrder(order)}
                  className="mt-3 px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 text-white text-sm font-medium"
                >
                  Delete Raw Material Order
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      {dialogNode}
    </div>
  );
};

export default PurchaseProduct;
