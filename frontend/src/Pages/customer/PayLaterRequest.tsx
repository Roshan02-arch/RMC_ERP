import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type CartItem = {
  key: string;
  itemType: "concrete" | "material";
  id: number;
  name: string;
  unit: string;
  quantity: number;
  pricePerUnit: number;
};

type CreatedConcreteOrder = {
  id: number;
  orderId: string;
};

const CART_KEY = "checkout_cart";

const parseApiResponse = async (response: Response) => {
  const raw = await response.text();
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return { message: raw };
  }
};

const PayLaterRequest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as {
    cart?: CartItem[];
    address?: string;
    deliveryDate?: string;
    creditDays?: 15 | 30;
  } | null) || null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const cart = useMemo(() => {
    if (Array.isArray(state?.cart) && state.cart.length > 0) {
      return state.cart;
    }
    try {
      const raw = localStorage.getItem(CART_KEY);
      const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [state]);

  const address = state?.address || "";
  const deliveryDate = state?.deliveryDate || "";
  const creditDays = state?.creditDays || 15;
  const concreteItems = cart.filter((item) => item.itemType === "concrete");
  const total = concreteItems.reduce((sum, item) => sum + item.pricePerUnit * item.quantity, 0);

  const submitRequest = async () => {
    setError("");

    const userId = localStorage.getItem("userId");
    if (!userId) {
      setError("User not logged in.");
      return;
    }
    if (concreteItems.length === 0) {
      setError("No concrete order found for pay later.");
      return;
    }
    if (!address.trim() || !deliveryDate) {
      setError("Delivery address and delivery date are required.");
      return;
    }

    try {
      setLoading(true);
      const createdOrders: CreatedConcreteOrder[] = [];

      for (const item of concreteItems) {
        const response = await fetch("http://localhost:8080/api/orders/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: Number(userId),
            grade: item.name,
            quantity: item.quantity,
            deliveryDate,
            address,
            totalPrice: item.pricePerUnit * item.quantity,
            paymentOption: "PAY_LATER",
            creditDays,
          }),
        });

        const data = await parseApiResponse(response);
        if (!response.ok) {
          throw new Error(data.message || `Unable to submit pay later request for ${item.name}`);
        }

        createdOrders.push(data as CreatedConcreteOrder);
      }

      localStorage.removeItem(CART_KEY);
      navigate("/pay-later-orders", {
        state: {
          successMessage: `Pay later request submitted for ${creditDays} days. Waiting for admin approval.`,
          selectedOrderId: createdOrders[0]?.orderId || "",
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to submit pay later request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-4xl mx-auto px-6 pt-28 pb-10 space-y-6">
        <section className="bg-white rounded-2xl shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900">Pay Later Request</h1>
          <p className="text-sm text-gray-600 mt-1">
            This order will go to admin for credit approval before scheduling.
          </p>
        </section>

        {error && (
          <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </section>
        )}

        <section className="bg-white rounded-2xl shadow-md p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <p><span className="font-semibold">Customer:</span> {localStorage.getItem("username") || "-"}</p>
            <p><span className="font-semibold">Phone:</span> {localStorage.getItem("userNumber") || "-"}</p>
            <p><span className="font-semibold">Email:</span> {localStorage.getItem("userEmail") || "-"}</p>
            <p><span className="font-semibold">Requested Credit:</span> {creditDays} days</p>
            <p className="md:col-span-2"><span className="font-semibold">Delivery Address:</span> {address || "-"}</p>
            <p className="md:col-span-2"><span className="font-semibold">Delivery Date:</span> {deliveryDate || "-"}</p>
          </div>

          <div className="rounded-xl border border-gray-200">
            {concreteItems.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-3 p-4 border-b border-gray-100 last:border-b-0">
                <div>
                  <p className="font-semibold text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.quantity} {item.unit}</p>
                </div>
                <p className="text-sm font-semibold text-gray-800">Rs.{(item.pricePerUnit * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">Credit Flow</p>
            <p className="text-sm text-amber-800 mt-1">
              Customer submits request, admin reviews credit, then order becomes approved or rejected. If rejected, pay from Billing & Payment to continue.
            </p>
            <p className="text-sm font-semibold text-amber-900 mt-3">Request Total: Rs.{total.toFixed(2)}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate("/checkout-payment", { state: { cart } })}
              className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 text-sm font-semibold"
            >
              Back
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={submitRequest}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold disabled:opacity-60"
            >
              {loading ? "Submitting..." : "Submit Pay Later Request"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default PayLaterRequest;
