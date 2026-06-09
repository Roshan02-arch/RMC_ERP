import { useEffect, useMemo, useState } from "react";
import {
  FiChevronRight,
  FiCreditCard,
  FiMail,
  FiMapPin,
  FiPhone,
  FiShoppingBag,
  FiTruck,
  FiUser,
} from "react-icons/fi";
import { toast } from "react-toastify";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../../api/api";
import { calculateQuotationTotals, extractQuotationDistance } from "../../utils/quotationPricing";

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
  quotation?: {
    id?: number | string;
    distance?: number;
    distanceKm?: number;
  };
};

type PaymentMethod = "ONLINE" | "CASH_ON_DELIVERY" | "PAY_LATER";
type SelectedPaymentMethod = PaymentMethod | "";

type DeliveryAddressCardProps = {
  customerName: string;
  setCustomerName: (value: string) => void;
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  address: string;
  setAddress: (value: string) => void;
};

type OrderDetailsCardProps = {
  cart: CartItem[];
  isExistingOrderPayment: boolean;
  paymentState: ExistingOrderPaymentState | null;
  updateQty: (key: string, qty: number) => void;
  removeItem: (key: string) => void;
};

type PaymentMethodCardProps = {
  method: SelectedPaymentMethod;
  setMethod: (value: SelectedPaymentMethod) => void;
  creditDays: 15 | 30;
  setCreditDays: (value: 15 | 30) => void;
  allowPayLater: boolean;
  allowCashOnDelivery: boolean;
};

type OrderSummaryCardProps = {
  subtotal: number;
  distance: number;
  deliveryCharges: number;
  tax: number;
  totalAmount: number;
  loading: boolean;
  disabled: boolean;
  buttonLabel: string;
  onSubmit: () => void;
};

const CART_KEY = "checkout_cart";
const RAZORPAY_KEY = (import.meta.env.VITE_RAZORPAY_KEY as string | undefined) || "rzp_test_SP8t85FWw5iSOH";
const GST_RATE = 18;

const cardShell = "rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]";
const inputClass = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white";

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

const playPaymentSuccessSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(523.25, context.currentTime);
    oscillator.frequency.linearRampToValueAtTime(659.25, context.currentTime + 0.12);
    oscillator.frequency.linearRampToValueAtTime(783.99, context.currentTime + 0.24);

    gainNode.gain.setValueAtTime(0.0001, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.45);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.45);

    window.setTimeout(() => {
      void context.close().catch(() => undefined);
    }, 700);
  } catch {
    // Ignore sound playback failures so payment flow is unaffected.
  }
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const getCurrentLocalDateTime = () => {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

const DeliveryAddressCard = ({
  customerName,
  setCustomerName,
  phoneNumber,
  setPhoneNumber,
  email,
  setEmail,
  address,
  setAddress,
}: DeliveryAddressCardProps) => (
  <section className={cardShell}>
    <div className="flex items-center gap-3">
      <div className="rounded-2xl bg-sky-50 p-3 text-sky-600">
        <FiMapPin className="text-xl" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">Checkout Details</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">Delivery Address</h2>
      </div>
    </div>

    <div className="mt-6 grid gap-4 md:grid-cols-2">
      <label className="space-y-2">
        <span className="text-sm font-semibold text-slate-700">Customer Name</span>
        <div className="relative">
          <FiUser className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${inputClass} pl-11`} value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
        </div>
      </label>

      <label className="space-y-2">
        <span className="text-sm font-semibold text-slate-700">Phone Number</span>
        <div className="relative">
          <FiPhone className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${inputClass} pl-11`} value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} />
        </div>
      </label>

      <label className="space-y-2 md:col-span-2">
        <span className="text-sm font-semibold text-slate-700">Email</span>
        <div className="relative">
          <FiMail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${inputClass} pl-11`} value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
      </label>

      <label className="space-y-2 md:col-span-2">
        <span className="text-sm font-semibold text-slate-700">Delivery Address</span>
        <div className="relative">
          <FiMapPin className="pointer-events-none absolute left-4 top-5 text-slate-400" />
          <textarea
            rows={4}
            className={`${inputClass} resize-none pl-11`}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Enter your delivery address"
          />
        </div>
      </label>

    </div>
  </section>
);

const OrderDetailsCard = ({
  cart,
  isExistingOrderPayment,
  paymentState,
  updateQty,
  removeItem,
}: OrderDetailsCardProps) => (
  <section className={cardShell}>
    <div className="flex items-center gap-3">
      <div className="rounded-2xl bg-orange-50 p-3 text-orange-600">
        <FiShoppingBag className="text-xl" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-600">Review Items</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">Order Details</h2>
      </div>
    </div>

    <div className="mt-6 overflow-x-auto">
      <table className="min-w-full text-sm text-left text-slate-700">
        <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.2em] text-slate-500">
          <tr>
            <th className="px-3 py-3">Product Grade</th>
            <th className="px-3 py-3">Quantity</th>
            <th className="px-3 py-3">Price / Unit</th>
            <th className="px-3 py-3">Total Price</th>
            {!isExistingOrderPayment && <th className="px-3 py-3">Action</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {isExistingOrderPayment ? (
            <tr>
              <td className="px-3 py-4 font-semibold text-slate-900">{paymentState?.existingOrderLabel || paymentState?.existingOrderId || "Existing Order"}</td>
              <td className="px-3 py-4">1</td>
              <td className="px-3 py-4">{formatCurrency(Number(paymentState?.existingAmount || 0))}</td>
              <td className="px-3 py-4 font-semibold text-slate-900">{formatCurrency(Number(paymentState?.existingAmount || 0))}</td>
            </tr>
          ) : (
            cart.map((item) => (
              <tr key={item.key}>
                <td className="px-3 py-4">
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.itemType === "concrete" ? "Concrete Product" : "Raw Material"}</p>
                </td>
                <td className="px-3 py-4">
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(event) => updateQty(item.key, Number(event.target.value))}
                    className="w-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                  />
                </td>
                <td className="px-3 py-4">{formatCurrency(item.pricePerUnit)} / {item.unit}</td>
                <td className="px-3 py-4 font-semibold text-slate-900">{formatCurrency(item.quantity * item.pricePerUnit)}</td>
                <td className="px-3 py-4">
                  <button
                    type="button"
                    onClick={() => removeItem(item.key)}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </section>
);

const PaymentMethodCard = ({
  method,
  setMethod,
  creditDays,
  setCreditDays,
  allowPayLater,
  allowCashOnDelivery,
}: PaymentMethodCardProps) => (
  <section className={cardShell}>
    <div className="flex items-center gap-3">
      <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
        <FiCreditCard className="text-xl" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-600">Checkout Payment</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">Payment Method</h2>
      </div>
    </div>

    <div className="mt-6 grid gap-4 md:grid-cols-3">
      <button
        type="button"
        onClick={() => setMethod("ONLINE")}
        title="Secure online payment using Razorpay checkout."
        className={`group relative rounded-2xl border p-4 text-left transition ${
          method === "ONLINE"
            ? "border-sky-500 bg-sky-50 shadow-sm"
            : "border-slate-200 bg-white hover:border-slate-300"
        }`}
      >
        <p className="text-sm font-semibold text-slate-900">Online Payment</p>
        <span className="pointer-events-none absolute -top-3 left-1/2 z-10 hidden w-64 -translate-x-1/2 -translate-y-full rounded-xl border border-sky-100 bg-sky-50/95 px-3 py-2 text-xs font-medium text-sky-900 shadow-[0_10px_30px_rgba(14,165,233,0.12)] backdrop-blur-sm group-hover:block">
          Secure online payment using Razorpay checkout.
        </span>
      </button>

      {allowCashOnDelivery && (
        <button
          type="button"
          onClick={() => setMethod("CASH_ON_DELIVERY")}
          title="Pay in cash when the order is delivered to your address."
          className={`group relative rounded-2xl border p-4 text-left transition ${
            method === "CASH_ON_DELIVERY"
              ? "border-slate-500 bg-slate-50 shadow-sm"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <p className="text-sm font-semibold text-slate-900">Cash on Delivery</p>
          <span className="pointer-events-none absolute -top-3 left-1/2 z-10 hidden w-64 -translate-x-1/2 -translate-y-full rounded-xl border border-sky-100 bg-sky-50/95 px-3 py-2 text-xs font-medium text-sky-900 shadow-[0_10px_30px_rgba(14,165,233,0.12)] backdrop-blur-sm group-hover:block">
            Pay in cash when the order is delivered to your address.
          </span>
        </button>
      )}

      {allowPayLater && (
        <button
          type="button"
          onClick={() => setMethod("PAY_LATER")}
          title="Request admin-approved credit terms for this order."
          className={`group relative rounded-2xl border p-4 text-left transition ${
            method === "PAY_LATER"
              ? "border-amber-500 bg-amber-50 shadow-sm"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <p className="text-sm font-semibold text-slate-900">Pay Later</p>
          <span className="pointer-events-none absolute -top-3 left-1/2 z-10 hidden w-64 -translate-x-1/2 -translate-y-full rounded-xl border border-sky-100 bg-sky-50/95 px-3 py-2 text-xs font-medium text-sky-900 shadow-[0_10px_30px_rgba(14,165,233,0.12)] backdrop-blur-sm group-hover:block">
            Request admin-approved credit terms for this order.
          </span>
        </button>
      )}
    </div>

    {allowPayLater && method === "PAY_LATER" && (
      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-amber-900">Credit Period</span>
          <select
            value={String(creditDays)}
            onChange={(event) => setCreditDays(Number(event.target.value) as 15 | 30)}
            className="w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-700"
          >
            <option value="15">7 - 15 Days</option>
            <option value="30">15 - 30 Days</option>
          </select>
        </label>
        <p className="mt-3 text-xs text-amber-900/80">Your pay later request will be sent for admin approval before dispatch.</p>
      </div>
    )}
  </section>
);

const OrderSummaryCard = ({
  subtotal,
  distance,
  deliveryCharges,
  tax,
  totalAmount,
  loading,
  disabled,
  buttonLabel,
  onSubmit,
}: OrderSummaryCardProps) => (
  <aside className={`${cardShell} sticky top-24`}>
    <div className="flex items-center gap-3">
      <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
        <FiTruck className="text-xl" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">Summary</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">Order Summary</h2>
      </div>
    </div>

    <div className="mt-6 space-y-4 text-sm text-slate-600">
      <div className="flex items-center justify-between">
        <span>Subtotal</span>
        <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
      </div>
      {deliveryCharges > 0 && (
        <div className="flex items-center justify-between">
          <span>Delivery Charges ({distance.toFixed(2)} km)</span>
          <span className="font-semibold text-slate-900">{formatCurrency(deliveryCharges)}</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span>Tax (GST {GST_RATE}%)</span>
        <span className="font-semibold text-slate-900">{formatCurrency(tax)}</span>
      </div>
      <div className="border-t border-dashed border-slate-200 pt-4">
        <div className="flex items-center justify-between text-base">
          <span className="font-semibold text-slate-900">Total Amount</span>
          <span className="font-bold text-slate-900">{formatCurrency(totalAmount)}</span>
        </div>
      </div>
    </div>

    <button
      type="button"
      disabled={disabled}
      onClick={onSubmit}
      className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-semibold text-white shadow-md transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
      <span>{buttonLabel}</span>
      {!loading && <FiChevronRight className="text-base" />}
    </button>
  </aside>
);

const CheckoutPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const paymentState = ((location.state as ExistingOrderPaymentState | null) || null);
  const checkoutState = ((location.state as {
    quotation?: {
      id?: number | string;
      distance?: number;
      distanceKm?: number;
    };
  } | null) || null);
  const queryOrderId = searchParams.get("orderId") || "";
  const existingOrderId = paymentState?.existingOrderId || queryOrderId || "";
  const [existingOrderAmount, setExistingOrderAmount] = useState<number>(Number(paymentState?.existingAmount || 0));
  const isExistingOrderPayment = Boolean(existingOrderId);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState(localStorage.getItem("username") || "");
  const [phoneNumber, setPhoneNumber] = useState(localStorage.getItem("userNumber") || "");
  const [email, setEmail] = useState(localStorage.getItem("userEmail") || "");
  const [address, setAddress] = useState(paymentState?.existingAddress || "");
  const [deliveryDate, setDeliveryDate] = useState(
    paymentState?.existingDeliveryDate || (isExistingOrderPayment ? "" : getCurrentLocalDateTime()),
  );
  const [method, setMethod] = useState<SelectedPaymentMethod>("ONLINE");
  const [creditDays, setCreditDays] = useState<15 | 30>(15);

  useEffect(() => {
    if (!isExistingOrderPayment || paymentState?.existingAmount) {
      return;
    }

    const run = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/orders/status/${encodeURIComponent(existingOrderId)}`);
        const raw = await response.text();
        let data: Record<string, unknown> = {};
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          data = { message: raw };
        }

        if (response.ok) {
          setExistingOrderAmount(Number(data.totalPrice || 0));
          setAddress(String(data.address || ""));
          setDeliveryDate(String(data.deliveryDate || ""));
          return;
        }

        const fallbackRes = await fetch(`${API_BASE_URL}/api/orders/orderId/${encodeURIComponent(existingOrderId)}`);
        const fallbackRaw = await fallbackRes.text();
        let fallbackData: Record<string, unknown> = {};
        try {
          fallbackData = fallbackRaw ? JSON.parse(fallbackRaw) : {};
        } catch {
          fallbackData = { message: fallbackRaw };
        }

        if (fallbackRes.ok) {
          setExistingOrderAmount(Number(fallbackData.totalPrice || 0));
          setAddress(String(fallbackData.address || ""));
          setDeliveryDate(String(fallbackData.deliveryDate || ""));
        }
      } catch {
        // keep fallback UI without blocking checkout
      }
    };

    void run();
  }, [existingOrderId, isExistingOrderPayment, paymentState?.existingAmount]);

  useEffect(() => {
    if (!isExistingOrderPayment && !deliveryDate) {
      setDeliveryDate(getCurrentLocalDateTime());
    }
  }, [deliveryDate, isExistingOrderPayment]);

  useEffect(() => {
    if (isExistingOrderPayment) {
      setMethod("ONLINE");
    }
  }, [isExistingOrderPayment]);

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
  }, [isExistingOrderPayment, location.state]);

  const [cart, setCart] = useState<CartItem[]>(initialCart);
  const quotationFromState = checkoutState?.quotation || paymentState?.quotation || null;
  const queryDistance = Number(searchParams.get("distance") || 0);
  const distance = useMemo(() => {
    const stateDistance = extractQuotationDistance(quotationFromState);
    if (stateDistance > 0) {
      return stateDistance;
    }
    return Number.isFinite(queryDistance) && queryDistance > 0 ? queryDistance : 0;
  }, [quotationFromState, queryDistance]);
  const concreteItems = cart.filter((item) => item.itemType === "concrete");
  const materialItems = cart.filter((item) => item.itemType === "material");
  const subtotal = isExistingOrderPayment
    ? existingOrderAmount
    : cart.reduce((sum, item) => sum + item.pricePerUnit * item.quantity, 0);
  const totals = useMemo(
    () => calculateQuotationTotals({ subtotal, distance, gstRate: GST_RATE }),
    [distance, subtotal],
  );
  const deliveryCharges = totals.transport;
  const tax = totals.gst;
  const totalAmount = totals.total;

  useEffect(() => {
    console.log("Checkout calculation", {
      quotation: quotationFromState,
      distance,
      subtotal,
      transport: deliveryCharges,
      gst: tax,
      total: totalAmount,
    });
  }, [deliveryCharges, distance, quotationFromState, subtotal, tax, totalAmount]);

  const persistCart = (items: CartItem[]) => {
    setCart(items);
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  };

  const removeItem = (key: string) => {
    persistCart(cart.filter((item) => item.key !== key));
  };

  const updateQty = (key: string, qty: number) => {
    if (qty <= 0) {
      removeItem(key);
      return;
    }
    persistCart(cart.map((item) => (item.key === key ? { ...item, quantity: qty } : item)));
  };

  const createConcreteOrder = async (
    item: CartItem,
    userId: string,
    paymentOption: "ONLINE" | "CASH_ON_DELIVERY" | "PAY_LATER",
  ) => {
    const response = await fetch(`${API_BASE_URL}/api/orders/create`, {
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
        creditDays: paymentOption === "PAY_LATER" ? creditDays : undefined,
      }),
    });
    const data = await parseApiResponse(response);
    if (!response.ok) throw new Error(data.message || `Unable to create order for ${item.name}`);
    return data as CreatedConcreteOrder;
  };

  const createMaterialOrder = async (item: CartItem, userId: string) => {
    const response = await fetch(`${API_BASE_URL}/api/inventory/raw-material-orders`, {
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
    return { id: Number.isFinite(orderId) ? orderId : 0 } as CreatedRawMaterialOrder;
  };

  const recordPayment = async (orderId: string, amount: number, paymentMethod: string) => {
    const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/payments`, {
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

  const openRazorpayCheckout = async (amount: number) => {
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
        description: "Checkout Payment",
        method: {
          upi: true,
          netbanking: true,
          card: false,
          wallet: false,
          emi: false,
          paylater: false,
        },
        prefill: {
          name: customerName,
          email,
          contact: phoneNumber,
        },
        theme: {
          color: "#2563eb",
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

    if (!customerName.trim() || !phoneNumber.trim() || !email.trim()) {
      setError("Customer name, phone number, and email are required.");
      return;
    }

    if (!isExistingOrderPayment && cart.length === 0) {
      setError("Cart is empty.");
      return;
    }

    if (!address.trim()) {
      setError("Delivery address is required.");
      return;
    }

    if (!isExistingOrderPayment && concreteItems.length > 0 && !deliveryDate) {
      setError("Preferred delivery date is required for concrete orders.");
      return;
    }

    if (!method) {
      setError("Select payment mode.");
      return;
    }

    try {
      setLoading(true);
      const createdOrderIds: string[] = [];
      const createdRawOrderIds: number[] = [];
      let paymentId = "";

      if (isExistingOrderPayment) {
        if (existingOrderAmount <= 0) {
          throw new Error("No payable amount found for this order.");
        }

        paymentId = await openRazorpayCheckout(totalAmount);
        await recordPayment(existingOrderId, totalAmount, `ONLINE|RAZORPAY:${paymentId}`);
        playPaymentSuccessSound();
        toast.success("Payment successful. Order confirmed.");
        navigate("/pay-later-orders", {
          state: {
            successMessage: "Order Confirmed / Payment Successful",
            selectedOrderId: existingOrderId,
          },
        });
        return;
      }

      if (subtotal <= 0) {
        throw new Error("No payable amount found for this order.");
      }

      for (const item of concreteItems) {
        const paymentOption = method === "PAY_LATER" ? "PAY_LATER" : method === "CASH_ON_DELIVERY" ? "CASH_ON_DELIVERY" : "ONLINE";
        const created = await createConcreteOrder(item, userId, paymentOption);
        createdOrderIds.push(created.orderId);
      }

      for (const item of materialItems) {
        const createdRaw = await createMaterialOrder(item, userId);
        if (createdRaw.id > 0) {
          createdRawOrderIds.push(createdRaw.id);
        }
      }

      localStorage.removeItem(CART_KEY);
      if (method === "ONLINE") {
        toast.success("Order placed successfully. It is pending admin approval. Complete payment after approval.");
      } else if (method === "CASH_ON_DELIVERY") {
        toast.success("Order placed successfully. It is pending admin approval.");
      } else {
        toast.success("Order placed successfully. It is pending admin approval.");
      }
      const firstConcreteOrderId = createdOrderIds[0] || "";
      const firstRawOrderId = createdRawOrderIds[0] || 0;

      if (firstConcreteOrderId) {
        localStorage.setItem("latest_order_approval_id", firstConcreteOrderId);
        navigate(`/order-approval-status/${encodeURIComponent(firstConcreteOrderId)}`);
        return;
      }

      navigate("/order-success", {
        state: {
          orderId: firstConcreteOrderId || (firstRawOrderId ? `RMO-${firstRawOrderId}` : "ORDER-SUCCESS"),
          paymentId: paymentId || (method === "PAY_LATER" ? "PAY-LATER-REQUESTED" : method === "CASH_ON_DELIVERY" ? "COD-REGISTERED" : "PENDING-APPROVAL"),
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

  const primaryButtonLabel = loading
    ? (isExistingOrderPayment ? "Processing Payment..." : "Processing Order...")
    : (isExistingOrderPayment ? "Pay Now" : "Place Order");

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]">
      {error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 px-4">
          <div className="w-full max-w-md rounded-3xl border border-rose-200 bg-white p-6 text-center shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-xl font-bold text-rose-600">
              !
            </div>

            <p className="mt-2 text-sm text-rose-600">{error}</p>
            <button
              type="button"
              onClick={() => setError("")}
              className="mt-5 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-500"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 pb-12 pt-24 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Checkout Payment</h1>
          </div>
         
        </div>

        {!isExistingOrderPayment && cart.length === 0 ? (
          <section className={`${cardShell} text-center`}>
            <h2 className="text-xl font-bold text-slate-900">Your cart is empty</h2>
            <p className="mt-2 text-sm text-slate-600">Add products to your cart before proceeding to checkout.</p>
            <button
              type="button"
              onClick={() => navigate("/purchaseproduct")}
              className="mt-5 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Back to Products
            </button>
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(320px,3fr)] lg:items-start">
            <div className="space-y-6">
              <DeliveryAddressCard
                customerName={customerName}
                setCustomerName={setCustomerName}
                phoneNumber={phoneNumber}
                setPhoneNumber={setPhoneNumber}
                email={email}
                setEmail={setEmail}
                address={address}
                setAddress={setAddress}
              />

              <OrderDetailsCard
                cart={cart}
                isExistingOrderPayment={isExistingOrderPayment}
                paymentState={paymentState}
                updateQty={updateQty}
                removeItem={removeItem}
              />

              <PaymentMethodCard
                method={method}
                setMethod={setMethod}
                creditDays={creditDays}
                setCreditDays={setCreditDays}
                allowPayLater={!isExistingOrderPayment}
                allowCashOnDelivery={!isExistingOrderPayment}
              />
            </div>

            <OrderSummaryCard
              subtotal={subtotal}
              distance={distance}
              deliveryCharges={deliveryCharges}
              tax={tax}
              totalAmount={totalAmount}
              loading={loading}
              disabled={loading || (!isExistingOrderPayment && cart.length === 0)}
              buttonLabel={primaryButtonLabel}
              onSubmit={() => void handlePlaceOrderAndPay()}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default CheckoutPayment;
