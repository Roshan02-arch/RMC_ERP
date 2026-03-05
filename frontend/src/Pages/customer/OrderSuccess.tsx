import { useLocation, useNavigate } from "react-router-dom";

const OrderSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as { orderId?: string; paymentId?: string } | null) || null;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f3f4f6_0%,#e5e7eb_100%)] flex items-center justify-center px-4">
      <div className="w-full max-w-3xl bg-white border border-gray-200 rounded-3xl shadow-xl p-10">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-4xl font-bold">
            ✓
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Congratulations</h1>
          <p className="mt-2 text-gray-700 text-lg">Your order has been successfully placed.</p>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Order Status</p>
            <p className="mt-1 text-lg font-semibold text-emerald-700">Confirmed</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Payment Status</p>
            <p className="mt-1 text-lg font-semibold text-emerald-700">Successful</p>
          </div>
        </div>

        {state?.orderId && (
          <p className="mt-6 text-sm text-gray-600 text-center">
            Order ID: <span className="font-semibold text-gray-900">{state.orderId}</span>
          </p>
        )}
        {state?.paymentId && (
          <p className="mt-1 text-sm text-gray-600 text-center">
            Payment ID: <span className="font-semibold text-gray-900">{state.paymentId}</span>
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <button
            onClick={() =>
              navigate("/billing-payment", {
                state: {
                  selectedOrderId: state?.orderId || "",
                  successMessage: "Order placed successfully. Invoice opened for this order.",
                },
              })
            }
            className="px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-semibold"
          >
            Billing and Invoice
          </button>
          <button
            onClick={() => navigate("/delivery-tracking")}
            className="px-5 py-2.5 rounded-lg bg-gray-200 text-gray-800 text-sm font-semibold"
          >
            Track Order
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
