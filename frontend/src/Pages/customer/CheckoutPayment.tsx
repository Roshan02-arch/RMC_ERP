import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, callback: (response: unknown) => void) => void;
    };
  }
}

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

type CreatedRawMaterialOrder = {
  id: number;
};

type ExistingOrderPaymentState = {
  existingOrderId?: string;
  existingOrderLabel?: string;
  existingAmount?: number;
  existingAddress?: string;
  existingDeliveryDate?: string;
};

const CART_KEY = "checkout_cart";
const RAZORPAY_KEY = (import.meta.env.VITE_RAZORPAY_KEY as string | undefined) || "rzp_test_SP8t85FWw5iSOH";

const parseApiResponse = async (response: Response) => {
  const raw = await response.text();
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return { message: raw };
  }
};

const loadRazorpayScript = async (): Promise<boolean> => {
  if (window.Razorpay) return true;
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const CheckoutPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [method, setMethod] = useState<"UPI" | "BANK_TRANSFER" | "CASH_ON_DELIVERY" | "PAY_LATER">("UPI");
  const [creditDays, setCreditDays] = useState<15 | 30>(15);
  const [upiId, setUpiId] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankUtr, setBankUtr] = useState("");
  const paymentState = ((location.state as ExistingOrderPaymentState | null) || null);
  const existingOrderId = paymentState?.existingOrderId || "";
  const existingOrderAmount = Number(paymentState?.existingAmount || 0);
  const isExistingOrderPayment = Boolean(existingOrderId);

  const initialCart = useMemo(() => {
    if (isExistingOrderPayment) return [];
    const stateCart = (location.state as { cart?: CartItem[] } | null)?.cart;
    if (Array.isArray(stateCart) && stateCart.length > 0) return stateCart;
    try {
      const raw = localStorage.getItem(CART_KEY);
      const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [location.state, isExistingOrderPayment]);

  const [cart, setCart] = useState<CartItem[]>(initialCart);
  const concreteItems = cart.filter((c) => c.itemType === "concrete");
  const materialItems = cart.filter((c) => c.itemType === "material");
  const estimatedTotal = isExistingOrderPayment ? existingOrderAmount : cart.reduce((sum, item) => sum + item.pricePerUnit * item.quantity, 0);
  const concreteTotal = isExistingOrderPayment ? existingOrderAmount : concreteItems.reduce((sum, item) => sum + item.pricePerUnit * item.quantity, 0);

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

  const createConcreteOrder = async (
    item: CartItem,
    userId: string,
    paymentOption: "ONLINE" | "CASH_ON_DELIVERY",
  ): Promise<CreatedConcreteOrder> => {
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
        paymentOption,
      }),
    });
    const data = await parseApiResponse(response);
    if (!response.ok) throw new Error(data.message || `Unable to create order for ${item.name}`);
    return data as CreatedConcreteOrder;
  };

  const createMaterialOrder = async (item: CartItem, userId: string): Promise<CreatedRawMaterialOrder> => {
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
    const data = await parseApiResponse(response);
    if (!response.ok) throw new Error(data.message || `Unable to create raw material order for ${item.name}`);
    const orderId = Number(data?.order?.id);
    return { id: Number.isFinite(orderId) ? orderId : 0 };
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
    const data = await parseApiResponse(response);
    if (!response.ok) throw new Error(data.message || "Unable to save payment");
  };

  const openRazorpayCheckout = async (amount: number, selectedMethod: "UPI" | "BANK_TRANSFER") => {
    const loaded = await loadRazorpayScript();
    if (!loaded || !window.Razorpay) {
      throw new Error("Unable to load Razorpay checkout");
    }

    return new Promise<string>((resolve, reject) => {
      const razorpay = new window.Razorpay({
        key: RAZORPAY_KEY,
        amount: Math.round(amount * 100),
        currency: "INR",
        name: "RMC ERP",
        description: "Concrete Order Payment",
        method: {
          upi: selectedMethod === "UPI",
          netbanking: selectedMethod === "BANK_TRANSFER",
          card: false,
          wallet: false,
          emi: false,
          paylater: false,
        },
        prefill: {
          name: localStorage.getItem("username") || "",
          email: localStorage.getItem("userEmail") || "",
          contact: localStorage.getItem("userNumber") || "",
        },
        theme: {
          color: "#111827",
        },
        handler: (response: { razorpay_payment_id?: string }) => {
          const paymentId = response?.razorpay_payment_id || "";
          if (!paymentId) {
            reject(new Error("Payment failed"));
            return;
          }
          resolve(paymentId);
        },
        modal: {
          ondismiss: () => reject(new Error("Payment cancelled")),
        },
      });

      razorpay.on("payment.failed", () => reject(new Error("Payment failed")));
      razorpay.open();
    });
  };

  const handlePlaceOrderAndPay = async () => {
    setError("");
    const userId = localStorage.getItem("userId");
    if (!userId) {
      setError("User not logged in.");
      return;
    }
    if (!isExistingOrderPayment && cart.length === 0) {
      setError("Cart is empty.");
      return;
    }
    if (!isExistingOrderPayment && !address.trim()) {
      setError("Delivery address is required.");
      return;
    }
    if (!isExistingOrderPayment && concreteItems.length > 0 && !deliveryDate) {
      setError("Delivery date/time is required for concrete orders.");
      return;
    }
    if (method === "PAY_LATER") {
      if (materialItems.length > 0) {
        setError("Pay later is available only for concrete orders.");
        return;
      }
      navigate("/pay-later-request", {
        state: {
          cart,
          address,
          deliveryDate,
          creditDays,
        },
      });
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
      const createdRawOrderIds: number[] = [];
      let razorpayPaymentId = "";

      if (isExistingOrderPayment) {
        if (method === "UPI" || method === "BANK_TRANSFER") {
          if (existingOrderAmount <= 0) {
            throw new Error("No payable amount found for this order.");
          }
          razorpayPaymentId = await openRazorpayCheckout(existingOrderAmount, method);
        }

        const payMethod =
          method === "UPI"
            ? `UPI:${upiId.trim()}|RAZORPAY:${razorpayPaymentId}`
            : method === "BANK_TRANSFER"
            ? `BANK_TRANSFER:${bankName.trim()}|A/C:${bankAccountNo.trim()}|IFSC:${bankIfsc.trim().toUpperCase()}|UTR:${bankUtr.trim()}|RAZORPAY:${razorpayPaymentId}`
            : "CASH_ON_DELIVERY";

        if (method !== "CASH_ON_DELIVERY") {
          await recordPayment(existingOrderId, existingOrderAmount, payMethod);
        }

        navigate("/order-success", {
          state: {
            orderId: existingOrderId,
            paymentId: method === "CASH_ON_DELIVERY" ? "COD-REGISTERED" : "PAYMENT-SUCCESS",
            selectedOrderId: existingOrderId,
            title: "Payment Completed",
            subtitle: "Payment received for your rejected credit order.",
            orderStatusLabel: "Payment Successful",
          },
        });
        return;
      }

      if (method === "UPI" || method === "BANK_TRANSFER") {
        if (concreteTotal <= 0) {
          throw new Error("No payable concrete amount found for online payment.");
        }
        razorpayPaymentId = await openRazorpayCheckout(concreteTotal, method);
      }

      for (const item of concreteItems) {
        const created = await createConcreteOrder(
          item,
          userId,
          method === "CASH_ON_DELIVERY" ? "CASH_ON_DELIVERY" : "ONLINE",
        );
        createdOrderIds.push(created.orderId);

        const payMethod =
          method === "UPI"
            ? `UPI:${upiId.trim()}|RAZORPAY:${razorpayPaymentId}`
            : method === "BANK_TRANSFER"
            ? `BANK_TRANSFER:${bankName.trim()}|A/C:${bankAccountNo.trim()}|IFSC:${bankIfsc.trim().toUpperCase()}|UTR:${bankUtr.trim()}|RAZORPAY:${razorpayPaymentId}`
            : "CASH_ON_DELIVERY";

        if (method !== "CASH_ON_DELIVERY") {
          await recordPayment(created.orderId, item.pricePerUnit * item.quantity, payMethod);
        }
      }

      for (const item of materialItems) {
        const createdRaw = await createMaterialOrder(item, userId);
        if (createdRaw.id > 0) {
          createdRawOrderIds.push(createdRaw.id);
        }
      }

      localStorage.removeItem(CART_KEY);
      const firstConcreteOrderId = createdOrderIds[0] || "";
      const firstRawOrderId = createdRawOrderIds[0] || 0;
      navigate("/order-success", {
        state: {
          orderId: firstConcreteOrderId || (firstRawOrderId ? `RMO-${firstRawOrderId}` : "RAW-MATERIAL-ORDER"),
          paymentId: method === "CASH_ON_DELIVERY" ? "COD-REGISTERED" : "PAYMENT-SUCCESS",
          selectedOrderId: firstConcreteOrderId,
          selectedRawOrderId: firstRawOrderId || undefined,
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
            <p className="text-sm text-gray-600 mt-1">
              {isExistingOrderPayment
                ? "Choose payment method to complete this existing order."
                : "Enter delivery and payment details, then complete order."}
            </p>

            {isExistingOrderPayment ? (
              <div className="mt-6 rounded-xl border border-gray-200 p-4">
                <p className="font-semibold text-gray-900">{paymentState?.existingOrderLabel || existingOrderId}</p>
                <p className="text-sm text-gray-600 mt-1">Existing order payment</p>
                <p className="text-sm text-gray-700 mt-2">Amount: Rs.{existingOrderAmount.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">Address: {paymentState?.existingAddress || "-"}</p>
                <p className="text-xs text-gray-500 mt-1">Delivery Date: {paymentState?.existingDeliveryDate || "-"}</p>
              </div>
            ) : cart.length === 0 ? (
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
                      <div className="text-sm text-gray-700">
                        <p>{item.pricePerUnit > 0 ? `Rs.${item.pricePerUnit} / ${item.unit}` : `${item.unit}`}</p>
                        {item.pricePerUnit > 0 && (
                          <p className="text-xs font-semibold text-gray-800 mt-1">
                            Amount: Rs.{(item.pricePerUnit * item.quantity).toFixed(2)}
                          </p>
                        )}
                      </div>
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
              {!isExistingOrderPayment && (
                <>
                  <textarea rows={3} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Delivery address" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  <input type="datetime-local" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </>
              )}

              <div className="grid grid-cols-1 gap-2">
                <button type="button" onClick={() => setMethod("UPI")} className={`px-3 py-2 rounded-lg text-sm font-semibold border ${method === "UPI" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300"}`}>UPI</button>
                <button type="button" onClick={() => setMethod("BANK_TRANSFER")} className={`px-3 py-2 rounded-lg text-sm font-semibold border ${method === "BANK_TRANSFER" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300"}`}>Bank Transfer</button>
                <button type="button" onClick={() => setMethod("CASH_ON_DELIVERY")} className={`px-3 py-2 rounded-lg text-sm font-semibold border ${method === "CASH_ON_DELIVERY" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300"}`}>Cash on Delivery</button>
                {!isExistingOrderPayment && (
                  <button type="button" onClick={() => setMethod("PAY_LATER")} className={`px-3 py-2 rounded-lg text-sm font-semibold border ${method === "PAY_LATER" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-300"}`}>Pay Later</button>
                )}
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

              {!isExistingOrderPayment && method === "PAY_LATER" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                  <p className="text-sm font-semibold text-amber-900">Select credit period</p>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setCreditDays(15)}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold border ${creditDays === 15 ? "bg-amber-600 text-white border-amber-600" : "bg-white text-amber-900 border-amber-300"}`}
                    >
                      7 to 15 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreditDays(30)}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold border ${creditDays === 30 ? "bg-amber-600 text-white border-amber-600" : "bg-white text-amber-900 border-amber-300"}`}
                    >
                      15 to 30 Days
                    </button>
                  </div>
                  <p className="text-xs text-amber-800">
                    The request goes to admin for credit approval before scheduling and dispatch.
                  </p>
                </div>
              )}

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                <p className="font-semibold text-gray-900">Order Value: Rs.{estimatedTotal.toFixed(2)}</p>
                <p className="text-gray-600 mt-1">Concrete Payment Value: Rs.{concreteTotal.toFixed(2)}</p>
              </div>

              <button type="button" disabled={loading || (!isExistingOrderPayment && cart.length === 0)} onClick={handlePlaceOrderAndPay} className="w-full px-4 py-3 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold disabled:opacity-60">
                {loading ? "Processing..." : method === "PAY_LATER" ? "Continue Pay Later" : "Pay and Place Order"}
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default CheckoutPayment;
