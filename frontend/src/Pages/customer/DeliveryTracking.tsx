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

type TrackingView = {
  dispatchStatus?: string;
  dispatchDateTime?: string;
  transitMixerNumber?: string;
  driverName?: string;
  driverShift?: string;
  expectedArrivalTime?: string;
  latestNotification?: string;
  gpsAvailable?: boolean;
  liveLatitude?: number;
  liveLongitude?: number;
};

const stageClass = (active: boolean) =>
  active
    ? "bg-indigo-600 text-white border-indigo-600"
    : "bg-white text-gray-500 border-gray-300";

const normalizeDeliveryStatus = (value?: string) => {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw) return "PENDING_APPROVAL";
  if (raw === "SCHEDULED_FOR_DISPATCH" || raw === "SCHEDULED") return "SCHEDULED";
  if (raw === "ON_THE_WAY" || raw === "IN_TRANSIT") return "IN_TRANSIT";
  return raw;
};

const toStatusLabel = (value: string) => value.replace(/_/g, " ");

const buildMapEmbedUrl = (latitude: number, longitude: number) => {
  const delta = 0.01;
  const bbox = `${longitude - delta},${latitude - delta},${longitude + delta},${latitude + delta}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${latitude},${longitude}`)}`;
};

const DeliveryTracking = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [loading, setLoading] = useState(true);
  const [trackingView, setTrackingView] = useState<TrackingView | null>(null);
  const [lastGpsSyncAt, setLastGpsSyncAt] = useState<Date | null>(null);

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

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!selectedOrderId || !userId) {
      setTrackingView(null);
      setLastGpsSyncAt(null);
      return;
    }

    const fetchTracking = async () => {
      try {
        const res = await fetch(
          `http://localhost:8080/api/delivery-tracking/orders/${selectedOrderId}?userId=${userId}`
        );
        if (!res.ok) {
          setTrackingView(null);
          return;
        }
        const data = await res.json();

        const dispatchInfo = data?.dispatchInformation ?? {};
        const driverInfo = dispatchInfo?.driverDetails ?? {};
        const estimatedInfo = data?.estimatedDeliveryTime ?? {};
        const realtimeInfo = data?.realTimeTracking ?? {};
        const liveLocation = realtimeInfo?.liveLocation ?? {};

        setTrackingView({
          dispatchStatus: dispatchInfo?.dispatchStatus,
          dispatchDateTime: dispatchInfo?.dispatchDateTime,
          transitMixerNumber: dispatchInfo?.assignedTransitMixerNumber,
          driverName: driverInfo?.name,
          driverShift: driverInfo?.shift,
          expectedArrivalTime: estimatedInfo?.expectedArrivalTime,
          latestNotification: estimatedInfo?.delayUpdate,
          gpsAvailable: Boolean(realtimeInfo?.gpsAvailable),
          liveLatitude: typeof liveLocation?.latitude === "number" ? liveLocation.latitude : undefined,
          liveLongitude: typeof liveLocation?.longitude === "number" ? liveLocation.longitude : undefined,
        });
        setLastGpsSyncAt(new Date());
      } catch (error) {
        console.error("Failed to load tracking details", error);
        setTrackingView(null);
        setLastGpsSyncAt(null);
      }
    };

    void fetchTracking();
    const intervalId = window.setInterval(() => {
      void fetchTracking();
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [selectedOrderId]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.orderId === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  const normalizedStatus = normalizeDeliveryStatus(trackingView?.dispatchStatus || selectedOrder?.status);
  const isScheduled = ["APPROVED", "IN_PRODUCTION", "SCHEDULED", "DISPATCHED", "IN_TRANSIT", "DELIVERED"].includes(normalizedStatus);
  const isDispatched = ["DISPATCHED", "IN_TRANSIT", "DELIVERED"].includes(normalizedStatus);
  const isInTransit = ["IN_TRANSIT", "DELIVERED"].includes(normalizedStatus);
  const isDelivered = normalizedStatus === "DELIVERED";
  const hasLiveLocation = typeof trackingView?.liveLatitude === "number" && typeof trackingView?.liveLongitude === "number";
  const mapsViewUrl = hasLiveLocation
    ? `https://www.google.com/maps?q=${trackingView.liveLatitude},${trackingView.liveLongitude}`
    : "";

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
                <p><span className="font-semibold">Dispatch Status:</span> {toStatusLabel(normalizedStatus)}</p>
                <p><span className="font-semibold">Transit Mixer Number:</span> {trackingView?.transitMixerNumber || selectedOrder.transitMixerNumber || "-"}</p>
                <p><span className="font-semibold">Driver Details:</span> {trackingView?.driverName || selectedOrder.driverName || "-"} {(trackingView?.driverShift || selectedOrder.driverShift) ? `(${trackingView?.driverShift || selectedOrder.driverShift})` : ""}</p>
                <p><span className="font-semibold">Dispatch Date & Time:</span> {trackingView?.dispatchDateTime || selectedOrder.dispatchDateTime || "-"}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Real-Time Tracking</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className={`border rounded-xl p-3 text-center text-xs font-semibold ${stageClass(isScheduled)}`}>Scheduled for Dispatch</div>
                <div className={`border rounded-xl p-3 text-center text-xs font-semibold ${stageClass(isDispatched)}`}>Dispatched</div>
                <div className={`border rounded-xl p-3 text-center text-xs font-semibold ${stageClass(isInTransit)}`}>In Transit</div>
                <div className={`border rounded-xl p-3 text-center text-xs font-semibold ${stageClass(isDelivered)}`}>Delivered</div>
              </div>
              {hasLiveLocation ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl overflow-hidden border border-gray-300 bg-gray-50">
                    <iframe
                      title="Live GPS location"
                      src={buildMapEmbedUrl(trackingView.liveLatitude!, trackingView.liveLongitude!)}
                      className="w-full h-72 border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-700 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <p>
                      <span className="font-semibold">Live GPS:</span>{" "}
                      {trackingView.liveLatitude?.toFixed(6)}, {trackingView.liveLongitude?.toFixed(6)}
                    </p>
                    <p className="text-gray-500">
                      Auto-refresh every 15s{lastGpsSyncAt ? ` | Last sync: ${lastGpsSyncAt.toLocaleTimeString()}` : ""}
                    </p>
                    <a
                      href={mapsViewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-700 hover:text-indigo-600 font-medium"
                    >
                      Open in Google Maps
                    </a>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
                  Live GPS location: Not available yet. Waiting for admin/tracking update with coordinates.
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Estimated Delivery Time</h2>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">ETA:</span> {trackingView?.expectedArrivalTime || selectedOrder.expectedArrivalTime || "-"}
              </p>
              <p className="text-sm text-indigo-700 mt-2">
                Delay/Update Notification: {trackingView?.latestNotification || selectedOrder.latestNotification || "No updates"}
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
