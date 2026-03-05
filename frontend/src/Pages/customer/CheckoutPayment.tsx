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
  totalPrice: number;
};

const CART_KEY = "checkout_cart";

const CheckoutPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [method, setMethod] = useState<"UPI" | "BANK_TRANSFER" | "CASH_ON_DELIVERY">("UPI");
  const [upiId, setUpiId] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankUtr, setBankUtr] = useState("");

  const initialCart = useMemo(() => {
    const stateCart = (location.state as { cart?: CartItem[] } | null)?.cart;
    if (Array.isArray(stateCart) && stateCart.length > 0) return stateCart;
    try {
      const raw = localStorage.getItem(CART_KEY);
      const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [location.state]);

  const [cart, setCart] = useState<CartItem[]>(initialCart);
  const concreteItems = cart.filter((c) => c.itemType === "concrete");
  const materialItems = cart.filter((c) => c.itemType === "material");
  const estimatedTotal = cart.reduce((sum, item) => sum + item.pricePerUnit * item.quantity, 0);
  const concreteTotal = concreteItems.reduce((sum, item) => sum + item.pricePerUnit * item.quantity, 0);

  const validUpi = (value: string) => /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/i.test(value.trim());
  const validIfsc = (value: string) => /^[A-Z]{4}0[A-Z0-9]{6}$/i.test(value.trim());

  const persistCart = (items: CartItem[]) => {
    setCart(items);
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  };

  const removeItem = (key: string) => {
    persistCart(cart.filter((c) => c.key !== key));
  };

  const updateQty = (key: string, qty: number) => {
    if (qty <= 0) {
      removeItem(key);
      return;
    }
    persistCart(cart.map((c) => (c.key === key ? { ...c, quantity: qty } : c)));
  };

  const createConcreteOrder = async (item: CartItem, userId: string): Promise<CreatedConcreteOrder> => {
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
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || `Unable to create order for ${item.name}`);
    return data as CreatedConcreteOrder;
  };

  const createMaterialOrder = async (item: CartItem, userId: string) => {
    const response = await fetch("http://localhost:8080/api/inventory/raw-material-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: Number(userId),
        materialId: item.id,
        quantity: item.quantity,
        address,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || `Unable to create raw material order for ${item.name}`);
  };

  const recordPayment = async (orderId: string, amount: number, paymentMethod: string) => {
    const response = await fetch(`http://localhost:8080/api/orders/${orderId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(amount.toFixed(2)),
        method: paymentMethod,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Unable to save payment");
  };

  const handlePlaceOrderAndPay = async () => {
    setError("");
    const userId = localStorage.getItem("userId");
    if (!userId) {
      setError("User not logged in.");
      return;
    }
    if (cart.length === 0) {
      setError("Cart is empty.");
      return;
    }
    if (!address.trim()) {
      setError("Delivery address is required.");
      return;
    }
    if (concreteItems.length > 0 && !deliveryDate) {
      setError("Delivery date/time is required for concrete orders.");
      return;
    }
    if (method === "UPI" && !validUpi(upiId)) {
      setError("Enter valid UPI ID (example: yourname@okaxis).");
      return;
    }
    if (method === "BANK_TRANSFER") {
      if (!bankAccountName.trim() || !bankName.trim() || !bankAccountNo.trim() || !bankUtr.trim()) {
        setError("Enter complete bank transfer details.");
        return;
      }
      if (!validIfsc(bankIfsc)) {
        setError("Enter valid IFSC code.");
        return;
      }
    }

    try {
      setLoading(true);
      const createdOrderIds: string[] = [];
      for (const item of concreteItems) {
        const created = await createConcreteOrder(item, userId);
        createdOrderIds.push(created.orderId);

        const payMethod =
          method === "UPI"
            ? `UPI:${upiId.trim()}`
            : method === "BANK_TRANSFER"
            ? `BANK_TRANSFER:${bankName.trim()}|A/C:${bankAccountNo.trim()}|IFSC:${bankIfsc.trim().toUpperCase()}|UTR:${bankUtr.trim()}`
            : "CASH_ON_DELIVERY";

        await recordPayment(created.orderId, item.pricePerUnit * item.quantity, payMethod);
      }

      for (const item of materialItems) {
        await createMaterialOrder(item, userId);
      }

      localStorage.removeItem(CART_KEY);
      navigate("/order-success", {
        state: {
          orderId: createdOrderIds[0] || "RAW-MATERIAL-ORDER",
          paymentId: method === "CASH_ON_DELIVERY" ? "COD-REGISTERED" : "PAYMENT-SUCCESS",
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to place order.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-7xl mx-auto px-6 pt-24 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <section className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-md p-6">
            <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
            <p className="text-sm text-gray-600 mt-1">Enter delivery and payment details, then complete order.</p>

            {cart.length === 0 ? (
              <div className="mt-6">
                <p className="text-gray-600">Cart is empty.</p>
                <button onClick={() => navigate("/purchaseproduct")} className="mt-3 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold">
                  Back to Products
                </button>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {cart.map((item) => (
                  <div key={item.key} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.itemType === "concrete" ? "Concrete Product" : "Raw Material"}</p>
                      </div>
                      <button onClick={() => removeItem(item.key)} className="text-xs px-3 py-1.5 rounded-md bg-red-100 text-red-700">
                        Remove
                      </button>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <input type="number" min={1} value={item.quantity} onChange={(e) => updateQty(item.key, Number(e.target.value))} className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                      <p className="text-sm text-gray-700">{item.pricePerUnit > 0 ? `Rs.${item.pricePerUnit} / ${item.unit}` : `${item.unit}`}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-md p-6 h-fit">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery and Payment</h2>
            {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm">{error}</div>}

            <div className="space-y-3">
              <textarea rows={3} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Delivery address" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <input type="datetime-local" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />

              <div className="grid grid-cols-1 gap-2">
                <button type="button" onClick={() => setMethod("UPI")} className={`px-3 py-2 rounded-lg text-sm font-semibold border ${method === "UPI" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300"}`}>UPI</button>
                <button type="button" onClick={() => setMethod("BANK_TRANSFER")} className={`px-3 py-2 rounded-lg text-sm font-semibold border ${method === "BANK_TRANSFER" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300"}`}>Bank Transfer</button>
                <button type="button" onClick={() => setMethod("CASH_ON_DELIVERY")} className={`px-3 py-2 rounded-lg text-sm font-semibold border ${method === "CASH_ON_DELIVERY" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300"}`}>Cash on Delivery</button>
              </div>

              {method === "UPI" && (
                <input type="text" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="UPI ID (example: name@okaxis)" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              )}

              {method === "BANK_TRANSFER" && (
                <div className="space-y-2">
                  <input type="text" value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} placeholder="Account Holder Name" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank Name" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <input type="text" value={bankAccountNo} onChange={(e) => setBankAccountNo(e.target.value)} placeholder="Account Number" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <input type="text" value={bankIfsc} onChange={(e) => setBankIfsc(e.target.value)} placeholder="IFSC Code" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase" />
                  <input type="text" value={bankUtr} onChange={(e) => setBankUtr(e.target.value)} placeholder="UTR / Reference Number" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
              )}

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                <p className="font-semibold text-gray-900">Order Value: Rs.{estimatedTotal.toFixed(2)}</p>
                <p className="text-gray-600 mt-1">Concrete Payment Value: Rs.{concreteTotal.toFixed(2)}</p>
              </div>

              <button type="button" disabled={loading || cart.length === 0} onClick={handlePlaceOrderAndPay} className="w-full px-4 py-3 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold disabled:opacity-60">
                {loading ? "Processing..." : "Pay and Place Order"}
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default CheckoutPayment;
