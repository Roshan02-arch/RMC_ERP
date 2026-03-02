import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { normalizeRole } from "../../utils/auth";

type Order = {
  id: number;
  orderId: string;
  grade: string;
  quantity: number;
  status: string;
  dispatchDateTime?: string;
  expectedArrivalTime?: string;
  transitMixerNumber?: string;
  driverName?: string;
  driverShift?: string;
  latestNotification?: string;
  approvedAt?: string;
};

const stageClass = (active: boolean) =>
  active
    ? "bg-indigo-600 text-white border-indigo-600"
    : "bg-white text-gray-500 border-gray-300";

const DeliveryTracking = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const role = normalizeRole(localStorage.getItem("role"));
    const userId = localStorage.getItem("userId");
    if (role !== "CUSTOMER") {
      navigate("/login");
      return;
    }
    if (!userId) {
      navigate("/login");
      return;
    }

    const fetchOrders = async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:8080/api/orders/my-orders/${userId}`);
        const data = await res.json();
        const items = Array.isArray(data) ? data : [];
        setOrders(items);
        if (items.length > 0) {
          setSelectedOrderId(items[0].orderId);
        }
      } catch (error) {
        console.error("Failed to load delivery tracking data", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchOrders();
  }, [navigate]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.orderId === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  const normalizedStatus = selectedOrder?.status || "PENDING_APPROVAL";
  const isScheduled = ["APPROVED", "IN_PRODUCTION", "DISPATCHED", "DELIVERED"].includes(normalizedStatus);
  const isDispatched = ["DISPATCHED", "DELIVERED"].includes(normalizedStatus);
  const isOnTheWay = normalizedStatus === "DISPATCHED";
  const isDelivered = normalizedStatus === "DELIVERED";

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-6xl mx-auto px-6 pt-28 pb-10 space-y-6">
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800">Delivery Tracking</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track dispatch, transit, ETA and delivery confirmation in read-only mode.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Order</label>
          {loading ? (
            <p className="text-sm text-gray-500">Loading orders...</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-gray-500">No orders found.</p>
          ) : (
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-md"
            >
              {orders.map((order) => (
                <option key={order.id} value={order.orderId}>
                  {order.orderId} ({order.status})
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedOrder && (
          <>
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Dispatch Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
                <p><span className="font-semibold">Dispatch Status:</span> {selectedOrder.status}</p>
                <p><span className="font-semibold">Transit Mixer Number:</span> {selectedOrder.transitMixerNumber || "-"}</p>
                <p><span className="font-semibold">Driver Details:</span> {selectedOrder.driverName || "-"} {selectedOrder.driverShift ? `(${selectedOrder.driverShift})` : ""}</p>
                <p><span className="font-semibold">Dispatch Date & Time:</span> {selectedOrder.dispatchDateTime || "-"}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Real-Time Tracking</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className={`border rounded-xl p-3 text-center text-xs font-semibold ${stageClass(isScheduled)}`}>Scheduled for Dispatch</div>
                <div className={`border rounded-xl p-3 text-center text-xs font-semibold ${stageClass(isDispatched)}`}>Dispatched</div>
                <div className={`border rounded-xl p-3 text-center text-xs font-semibold ${stageClass(isOnTheWay)}`}>On the Way</div>
                <div className={`border rounded-xl p-3 text-center text-xs font-semibold ${stageClass(isDelivered)}`}>Delivered</div>
              </div>
              <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
                Live GPS location: Not available (GPS integration not configured).
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Estimated Delivery Time</h2>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">ETA:</span> {selectedOrder.expectedArrivalTime || "-"}
              </p>
              <p className="text-sm text-indigo-700 mt-2">
                Delay/Update Notification: {selectedOrder.latestNotification || "No updates"}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Delivery Confirmation</h2>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Delivery Status:</span> {isDelivered ? "Delivered" : "Pending Delivery"}
              </p>
              <p className="text-sm text-gray-700 mt-2">
                <span className="font-semibold">Confirmation:</span>{" "}
                {isDelivered
                  ? "Concrete delivered successfully. Next stage: Billing and Payment."
                  : "Delivery confirmation will be available after completion."}
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default DeliveryTracking;
