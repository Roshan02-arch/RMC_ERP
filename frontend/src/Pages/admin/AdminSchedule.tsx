import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCenteredDialog } from "../../hooks/useCenteredDialog";

interface Order {
  id: number;
  orderId: string;
  quantity?: number;
  status: string;
  deliveryTrackingStatus?: string;
  deliveryTrackingStatusLabel?: string;
  productionDate?: string;
  productionSlotStart?: string;
  productionSlotEnd?: string;
  plantAllocation?: string;
  priorityLevel?: string;
  dispatchDateTime?: string;
  tripPlanning?: string;
  deliverySequence?: string;
  expectedArrivalTime?: string;
  transitMixerNumber?: string;
  driverName?: string;
  driverShift?: string;
  latestNotification?: string;
  delayInMinutes?: number;
  returnReason?: string;
  returnedQuantity?: number;
  liveLatitude?: number;
  liveLongitude?: number;
  plannedTrips?: number;
  completedTrips?: number;
  totalFuelUsedLiters?: number;
  tripRecords?: TripRecord[];
}

interface AvailabilityItem {
  id: string;
  available: boolean;
  assignedOrderId?: string;
  busyFrom?: string;
  busyTo?: string;
}

interface TripRecord {
  id?: number;
  tripNumber?: number;
  status?: string;
  shift?: string;
  tripQuantityM3?: number;
  scheduledDispatchTime?: string;
  actualDispatchTime?: string;
  estimatedDeliveryTime?: string;
  deliveredTime?: string;
  fuelUsedLiters?: number;
  remarks?: string;
  returnReason?: string;
  returnedQuantity?: number;
  transitMixerNumber?: string;
  driverName?: string;
}

const API = "http://localhost:8080/api/admin";
const TRACKING_API = "http://localhost:8080/api/delivery-tracking";

const AdminSchedule = () => {
  const navigate = useNavigate();
  const { showMessage, dialogNode } = useCenteredDialog();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");

  const [production, setProduction] = useState({
    productionDate: "",
    productionSlotStart: "",
    productionSlotEnd: "",
    plantAllocation: "",
    priorityLevel: "NORMAL",
  });

  const [dispatch, setDispatch] = useState({
    dispatchDateTime: "",
    tripPlanning: "SINGLE_TRIP",
    plannedTrips: "1",
    truckCapacityM3: "6",
    estimatedTravelMinutes: "90",
    dispatchIntervalMinutes: "60",
    expectedArrivalTime: "",
  });

  const [vehicle, setVehicle] = useState({
    transitMixerNumber: "",
    driverName: "",
    driverShift: "",
    backupTransitMixerNumber: "",
    backupDriverName: "",
  });
  const [gps, setGps] = useState({
    liveLatitude: "",
    liveLongitude: "",
  });
  const [vehicleAvailability, setVehicleAvailability] = useState<AvailabilityItem[]>([]);
  const [driverAvailability, setDriverAvailability] = useState<AvailabilityItem[]>([]);
  const [tripRecords, setTripRecords] = useState<TripRecord[]>([]);
  const [tripPlanPreview, setTripPlanPreview] = useState<Array<{ tripNumber: number; quantityM3: number }>>([]);
  const [selectedTripPreview, setSelectedTripPreview] = useState("");

  const [rescheduleReason, setRescheduleReason] = useState("");

  const selectedOrder = useMemo(
    () => orders.find((order) => order.orderId === selectedOrderId),
    [orders, selectedOrderId]
  );
  const selectedTripPlan = useMemo(
    () => tripPlanPreview.find((trip) => String(trip.tripNumber) === selectedTripPreview) ?? null,
    [tripPlanPreview, selectedTripPreview]
  );
  const isVehicleAndDriverAssigned = useMemo(() => {
    const mixer = String(selectedOrder?.transitMixerNumber || "").trim();
    const driver = String(selectedOrder?.driverName || "").trim();
    return mixer.length > 0 && driver.length > 0;
  }, [selectedOrder?.transitMixerNumber, selectedOrder?.driverName]);
  const formatDateTimeWith12And24 = (value?: string | null) => {
    if (!value) return "-";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return value;

    const dateLabel = dt.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const time12 = dt.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const time24 = dt.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    return `${dateLabel}, ${time12} (${time24})`;
  };
  const getAutomatedDeliveryStatus = (order?: Order | null) => {
    if (!order) return "UNKNOWN";
    const status = String(order.status || "").trim().toUpperCase();
    const trackingLabel = String(order.deliveryTrackingStatusLabel || "").trim().toUpperCase();
    const tracking = String(order.deliveryTrackingStatus || "").trim().toUpperCase();

    if (status === "RETURNED" || trackingLabel === "RETURNED" || tracking === "RETURNED") return "RETURNED";
    if (status === "DELIVERED" || trackingLabel === "DELIVERED" || tracking === "DELIVERED") return "DELIVERED";
    if (status === "IN_PRODUCTION") return "IN_PRODUCTION";
    if (trackingLabel === "IN_TRANSIT" || tracking === "IN_TRANSIT" || tracking === "ON_THE_WAY") return "IN_TRANSIT";
    if (status === "DISPATCHED" || trackingLabel === "DISPATCHED" || tracking === "DISPATCHED") return "DISPATCHED";
    if (trackingLabel === "SCHEDULED" || tracking === "SCHEDULED_FOR_DISPATCH") return "SCHEDULED";
    if (status === "APPROVED") return "APPROVED";
    if (status === "PENDING_APPROVAL") return "PENDING_APPROVAL";
    if (status === "REJECTED") return "REJECTED";
    return status || "UNKNOWN";
  };
  const automatedDeliveryStatus = useMemo(
    () => getAutomatedDeliveryStatus(selectedOrder),
    [selectedOrder]
  );
  const formatStatusLabel = (value: string) => value.replaceAll("_", " ");
  const statusBadgeClass =
    automatedDeliveryStatus === "DELIVERED"
      ? "bg-green-100 text-green-700"
      : automatedDeliveryStatus === "IN_PRODUCTION"
      ? "bg-indigo-100 text-indigo-700"
      : automatedDeliveryStatus === "DISPATCHED" || automatedDeliveryStatus === "IN_TRANSIT"
      ? "bg-blue-100 text-blue-700"
      : automatedDeliveryStatus === "SCHEDULED"
      ? "bg-cyan-100 text-cyan-700"
      : automatedDeliveryStatus === "RETURNED"
      ? "bg-rose-100 text-rose-700"
      : "bg-slate-100 text-slate-700";

  useEffect(() => {
    setGps({
      liveLatitude:
        selectedOrder?.liveLatitude !== undefined && selectedOrder?.liveLatitude !== null
          ? String(selectedOrder.liveLatitude)
          : "",
      liveLongitude:
        selectedOrder?.liveLongitude !== undefined && selectedOrder?.liveLongitude !== null
          ? String(selectedOrder.liveLongitude)
          : "",
    });
  }, [selectedOrder?.orderId, selectedOrder?.liveLatitude, selectedOrder?.liveLongitude]);

  useEffect(() => {
    if (!selectedOrder) {
      setTripRecords([]);
    }
  }, [selectedOrder]);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API}/orders`);
      const data = await res.json();
      const items = Array.isArray(data) ? data : [];
      setOrders(items);
      if (items.length === 0) {
        setSelectedOrderId("");
        return;
      }
      if (!selectedOrderId) {
        setSelectedOrderId(items[0].orderId);
        return;
      }
      if (!items.some((order: Order) => order.orderId === selectedOrderId)) {
        setSelectedOrderId(items[0].orderId);
      }
    } catch (error) {
      console.error("Failed to fetch orders", error);
    }
  };

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "ADMIN") {
      navigate("/login");
      return;
    }
    void fetchOrders();
  }, [navigate]);

  useEffect(() => {
    void fetchTripRecords();
  }, [selectedOrderId]);

  useEffect(() => {
    void calculateTripPlanPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrderId]);

  useEffect(() => {
    if (tripPlanPreview.length === 0) {
      setSelectedTripPreview("");
      return;
    }
    if (!tripPlanPreview.some((trip) => String(trip.tripNumber) === selectedTripPreview)) {
      setSelectedTripPreview(String(tripPlanPreview[0].tripNumber));
    }
  }, [tripPlanPreview, selectedTripPreview]);

  const send = async (url: string, payload: Record<string, unknown>) => {
    if (!selectedOrderId) {
      await showMessage("Please select an order");
      return false;
    }
    const adminUserId = localStorage.getItem("userId");
    if (!adminUserId) {
      await showMessage("Admin user not found. Please login again.");
      return false;
    }
    const separator = url.includes("?") ? "&" : "?";
    const res = await fetch(`${API}/orders/${selectedOrderId}${url}${separator}adminUserId=${encodeURIComponent(adminUserId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let message = "";
    try {
      const body = JSON.parse(text);
      message = body.message || "";
    } catch {
      message = text;
    }
    if (!res.ok) {
      await showMessage(message || "Request failed");
      return false;
    }
    await showMessage(message || "Updated successfully");
    await fetchOrders();
    await fetchTripRecords();
    return true;
  };

  const sendTrackingUpdate = async (payload: Record<string, unknown>) => {
    if (!selectedOrderId) {
      await showMessage("Please select an order");
      return false;
    }

    const adminUserId = localStorage.getItem("userId");
    if (!adminUserId) {
      await showMessage("Admin user not found. Please login again.");
      return false;
    }

    const res = await fetch(`${TRACKING_API}/admin/orders/${selectedOrderId}?adminUserId=${adminUserId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let message = "";
    try {
      const body = JSON.parse(text);
      message = body.message || "";
    } catch {
      message = text;
    }

    if (!res.ok) {
      await showMessage(message || "Tracking update failed");
      return false;
    }

    await showMessage(message || "Tracking updated successfully");
    await fetchOrders();
    return true;
  };

  const fetchTripRecords = async () => {
    if (!selectedOrderId) {
      setTripRecords([]);
      return;
    }

    const adminUserId = localStorage.getItem("userId");
    if (!adminUserId) {
      setTripRecords([]);
      return;
    }

    try {
      const res = await fetch(
        `${API}/orders/${selectedOrderId}/trips?adminUserId=${encodeURIComponent(adminUserId)}`
      );
      if (!res.ok) {
        setTripRecords([]);
        return;
      }
      const data = await res.json();
      setTripRecords(Array.isArray(data?.trips) ? data.trips : []);
    } catch (error) {
      console.error("Failed to fetch trip records", error);
      setTripRecords([]);
    }
  };

  const loadAvailability = async (windowStart: string, windowEnd: string, silent = false) => {
    const adminUserId = localStorage.getItem("userId");
    if (!adminUserId) {
      if (!silent) {
        await showMessage("Admin user not found. Please login again.");
      }
      return;
    }
    if (!windowStart || !windowEnd) {
      setVehicleAvailability([]);
      setDriverAvailability([]);
      if (!silent) {
        await showMessage("Dispatch time and ETA are required to check availability.");
      }
      return;
    }

    const res = await fetch(
      `${API}/dispatch/availability?adminUserId=${encodeURIComponent(adminUserId)}&windowStart=${encodeURIComponent(
        windowStart
      )}&windowEnd=${encodeURIComponent(windowEnd)}`
    );

    const text = await res.text();
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }

    if (!res.ok) {
      const message = typeof data.message === "string" ? data.message : "Failed to load availability";
      if (!silent) {
        await showMessage(message);
      }
      return;
    }

    setVehicleAvailability(Array.isArray(data.vehicles) ? (data.vehicles as AvailabilityItem[]) : []);
    setDriverAvailability(Array.isArray(data.drivers) ? (data.drivers as AvailabilityItem[]) : []);
  };

  useEffect(() => {
    void loadAvailability(
      selectedOrder?.dispatchDateTime || "",
      selectedOrder?.expectedArrivalTime || "",
      true
    );
  }, [selectedOrder?.orderId, selectedOrder?.dispatchDateTime, selectedOrder?.expectedArrivalTime]);

  const onProductionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await send("/schedule/production", production);
  };

  const onDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVehicleAndDriverAssigned) {
      await showMessage("Assign vehicle and driver before dispatch scheduling.");
      return;
    }
    const plannedTrips = Number(dispatch.plannedTrips);
    const truckCapacityM3 = Number(dispatch.truckCapacityM3);
    const estimatedTravelMinutes = Number(dispatch.estimatedTravelMinutes);
    const dispatchIntervalMinutes = Number(dispatch.dispatchIntervalMinutes);
    await send("/schedule/dispatch", {
      ...dispatch,
      plannedTrips: Number.isFinite(plannedTrips) ? plannedTrips : 1,
      truckCapacityM3: Number.isFinite(truckCapacityM3) ? truckCapacityM3 : 6,
      estimatedTravelMinutes: Number.isFinite(estimatedTravelMinutes) ? estimatedTravelMinutes : 90,
      dispatchIntervalMinutes: Number.isFinite(dispatchIntervalMinutes) ? dispatchIntervalMinutes : 60,
    });
    await calculateTripPlanPreview();
  };

  async function calculateTripPlanPreview() {
    if (!selectedOrderId) {
      setTripPlanPreview([]);
      return;
    }
    const adminUserId = localStorage.getItem("userId");
    if (!adminUserId) {
      setTripPlanPreview([]);
      return;
    }
    const capacityM3 = Number(dispatch.truckCapacityM3);
    const res = await fetch(
      `${API}/orders/${selectedOrderId}/dispatch/calculate-trips?adminUserId=${encodeURIComponent(adminUserId)}&capacityM3=${encodeURIComponent(
        String(Number.isFinite(capacityM3) && capacityM3 > 0 ? capacityM3 : 6)
      )}`
    );
    if (!res.ok) {
      setTripPlanPreview([]);
      return;
    }
    const data = await res.json();
    setTripPlanPreview(Array.isArray(data?.tripPlan) ? data.tripPlan : []);
    if (data?.requiredTrips) {
      setDispatch((prev) => ({ ...prev, plannedTrips: String(data.requiredTrips), tripPlanning: data.requiredTrips > 1 ? "MULTIPLE_TRIPS" : "SINGLE_TRIP" }));
    }
  }

  const onVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await send("/schedule/vehicle", vehicle);
  };

  const onGpsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const lat = Number(gps.liveLatitude);
    const lon = Number(gps.liveLongitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      await showMessage("Latitude and Longitude must be valid numbers");
      return;
    }
    if (lat < -90 || lat > 90) {
      await showMessage("Latitude must be between -90 and 90");
      return;
    }
    if (lon < -180 || lon > 180) {
      await showMessage("Longitude must be between -180 and 180");
      return;
    }

    await sendTrackingUpdate({
      liveLatitude: lat,
      liveLongitude: lon,
    });
  };

  const onReschedule = async () => {
    if (!selectedOrderId) {
      await showMessage("Please select an order");
      return;
    }
    await send("/reschedule", { ...production, ...dispatch, ...vehicle, rescheduleReason });
  };

  const onMarkDelivered = async () => {
    if (!selectedOrderId) {
      await showMessage("Please select an order");
      return;
    }
    if (automatedDeliveryStatus !== "DISPATCHED" && automatedDeliveryStatus !== "IN_TRANSIT") {
      await showMessage("Order must be dispatched or in transit before marking delivered.");
      return;
    }
    await send("/workflow-step", { step: "DELIVERED" });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-64 bg-slate-900 text-white flex flex-col p-6 shadow-xl">
        <h2 className="text-2xl font-bold text-indigo-400 mb-10">Admin Panel</h2>
        <nav className="flex flex-col gap-4 text-sm font-medium">
          <button onClick={() => navigate("/admin")} className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition">Dashboard</button>
          <button onClick={() => navigate("/admin/orders")} className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition">Orders</button>
          <button onClick={() => navigate("/admin/credit-orders")} className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition">Approval Page</button>
          <button onClick={() => navigate("/admin/users")} className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition">Users</button>
          <button onClick={() => navigate("/admin/adminlogins")} className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition">Admin Logins</button>
          <button onClick={() => navigate("/admin/schedule")} className="text-left px-3 py-2 rounded-lg bg-slate-800">Schedule</button>
          <button onClick={() => navigate("/admin/inventory")} className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition">Inventory</button>

          <button
            onClick={() => navigate("/admin/finance")}
            className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition"
          >
            Finance
          </button>
          <button
            onClick={() => navigate("/admin/quality-control")}
            className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition"
          >
            Quality Control
          </button>
          <button
            onClick={() => navigate("/admin/maintenance")}
            className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition"
          >
            Maintenance
          </button>
          <button
            onClick={() => {
              localStorage.clear();
              navigate("/login");
            }}
            className="text-left px-3 py-2 rounded-lg text-red-400 hover:bg-slate-800 hover:text-red-300 transition"
          >
            Logout
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-8 space-y-8">
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h1 className="text-2xl font-semibold text-gray-800 mb-4">Schedule Process</h1>
          <label className="block text-sm text-gray-600 mb-2">Select Order</label>
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
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <form onSubmit={onProductionSubmit} className="order-1 bg-white rounded-2xl shadow-md p-6 space-y-3">
            <h2 className="text-lg font-semibold text-gray-800">Production Scheduling</h2>
            <input type="date" value={production.productionDate} onChange={(e) => setProduction({ ...production, productionDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <input type="datetime-local" value={production.productionSlotStart} onChange={(e) => setProduction({ ...production, productionSlotStart: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <p className="text-xs text-gray-500">Start time: {formatDateTimeWith12And24(production.productionSlotStart)}</p>
            <input type="datetime-local" value={production.productionSlotEnd} onChange={(e) => setProduction({ ...production, productionSlotEnd: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <p className="text-xs text-gray-500">End time: {formatDateTimeWith12And24(production.productionSlotEnd)}</p>
            <input type="text" placeholder="Plant allocation" value={production.plantAllocation} onChange={(e) => setProduction({ ...production, plantAllocation: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <select value={production.priorityLevel} onChange={(e) => setProduction({ ...production, priorityLevel: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md">
              <option value="NORMAL">Normal</option>
              <option value="URGENT">Urgent</option>
            </select>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">Save Production</button>
          </form>

          <form onSubmit={onDispatchSubmit} className="order-3 bg-white rounded-2xl shadow-md p-6 space-y-3">
            <h2 className="text-lg font-semibold text-gray-800">Dispatch Scheduling</h2>
           
            <input type="datetime-local" value={dispatch.dispatchDateTime} onChange={(e) => setDispatch({ ...dispatch, dispatchDateTime: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <p className="text-xs text-gray-500">Dispatch time: {formatDateTimeWith12And24(dispatch.dispatchDateTime)}</p>
            <input
              type="number"
              step="0.1"
              min={1}
              placeholder="Truck Capacity (m3)"
              value={dispatch.truckCapacityM3}
              onChange={(e) => setDispatch({ ...dispatch, truckCapacityM3: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="number"
                min={10}
                placeholder="Dispatch interval (minutes)"
                value={dispatch.dispatchIntervalMinutes}
                onChange={(e) => setDispatch({ ...dispatch, dispatchIntervalMinutes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <input
                type="number"
                min={10}
                placeholder="Estimated travel (minutes)"
                value={dispatch.estimatedTravelMinutes}
                onChange={(e) => setDispatch({ ...dispatch, estimatedTravelMinutes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <button type="button" onClick={() => void calculateTripPlanPreview()} className="px-4 py-2 bg-blue-600 text-white rounded-md">
              Calculate Trips
            </button>
            <select value={dispatch.tripPlanning} onChange={(e) => setDispatch({ ...dispatch, tripPlanning: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md">
              <option value="SINGLE_TRIP">Single Trip</option>
              <option value="MULTIPLE_TRIPS">Multiple Trips</option>
            </select>
            <input
              type="number"
              min={dispatch.tripPlanning === "MULTIPLE_TRIPS" ? 2 : 1}
              value={dispatch.plannedTrips}
              onChange={(e) => setDispatch({ ...dispatch, plannedTrips: e.target.value })}
              placeholder="Planned trips"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <input type="datetime-local" value={dispatch.expectedArrivalTime} onChange={(e) => setDispatch({ ...dispatch, expectedArrivalTime: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <p className="text-xs text-gray-500">ETA: {formatDateTimeWith12And24(dispatch.expectedArrivalTime)}</p>
            {tripPlanPreview.length > 0 && (
              <div className="border border-gray-200 rounded-md p-3 bg-gray-50 text-sm">
                <p className="font-semibold text-gray-700 mb-2">Auto Trip Plan</p>
                <select
                  value={selectedTripPreview}
                  onChange={(e) => setSelectedTripPreview(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                >
                  {tripPlanPreview.map((trip) => (
                    <option key={trip.tripNumber} value={String(trip.tripNumber)}>
                      Trip {trip.tripNumber} ({trip.quantityM3} m3)
                    </option>
                  ))}
                </select>
                {selectedTripPlan && (
                  <p className="mt-2 text-gray-600">
                    Selected: Trip {selectedTripPlan.tripNumber} - {selectedTripPlan.quantityM3} m3
                  </p>
                )}
              </div>
            )}
            <button
              type="submit"
              disabled={!isVehicleAndDriverAssigned}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Dispatch
            </button>
          </form>

          <form onSubmit={onVehicleSubmit} className="order-2 bg-white rounded-2xl shadow-md p-6 space-y-3">
            <h2 className="text-lg font-semibold text-gray-800">Vehicle & Driver</h2>
            <input
              type="text"
              list="available-vehicles"
              placeholder="Transit mixer number"
              value={vehicle.transitMixerNumber}
              onChange={(e) => setVehicle({ ...vehicle, transitMixerNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              type="text"
              list="available-drivers"
              placeholder="Driver name"
              value={vehicle.driverName}
              onChange={(e) => setVehicle({ ...vehicle, driverName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <select
              value={vehicle.driverShift}
              onChange={(e) => setVehicle({ ...vehicle, driverShift: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Select shift timing</option>
              <option value="MORNING">Morning</option>
              <option value="EVENING">Evening</option>
            </select>
            <input type="text" placeholder="Backup mixer (optional)" value={vehicle.backupTransitMixerNumber} onChange={(e) => setVehicle({ ...vehicle, backupTransitMixerNumber: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <input type="text" placeholder="Backup driver (optional)" value={vehicle.backupDriverName} onChange={(e) => setVehicle({ ...vehicle, backupDriverName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-md">Assign Vehicle</button>

            <datalist id="available-vehicles">
              {vehicleAvailability
                .filter((item) => item.available)
                .map((item) => (
                  <option key={item.id} value={item.id} />
                ))}
            </datalist>
            <datalist id="available-drivers">
              {driverAvailability
                .filter((item) => item.available)
                .map((item) => (
                  <option key={item.id} value={item.id} />
                ))}
            </datalist>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Rescheduling & Notification</h2>
          <textarea
            value={rescheduleReason}
            onChange={(e) => setRescheduleReason(e.target.value)}
            placeholder="Reason for rescheduling (traffic, breakdown, plant issue, etc.)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-24"
          />
          <div className="mt-3">
            <button onClick={onReschedule} className="px-4 py-2 bg-red-600 text-white rounded-md">Reschedule Selected Order</button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Transit Mixer Availability</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() =>
                void loadAvailability(
                  selectedOrder?.dispatchDateTime || "",
                  selectedOrder?.expectedArrivalTime || ""
                )
              }
              className="px-4 py-2 bg-slate-800 text-white rounded-md md:col-start-1"
            >
              Check Availability
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
            <div className="border border-gray-200 rounded-xl p-3">
              <h3 className="font-semibold text-gray-800 mb-2">Vehicles</h3>
              <div className="space-y-2 max-h-52 overflow-auto">
                {vehicleAvailability.length === 0 && <p className="text-gray-500">No data loaded</p>}
                {vehicleAvailability.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
                    <span className="font-medium">{item.id}</span>
                    <span className={item.available ? "text-green-600" : "text-red-600"}>
                      {item.available ? "Available" : `Busy (${item.assignedOrderId || "-"})`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl p-3">
              <h3 className="font-semibold text-gray-800 mb-2">Drivers</h3>
              <div className="space-y-2 max-h-52 overflow-auto">
                {driverAvailability.length === 0 && <p className="text-gray-500">No data loaded</p>}
                {driverAvailability.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
                    <span className="font-medium">{item.id}</span>
                    <span className={item.available ? "text-green-600" : "text-red-600"}>
                      {item.available ? "Available" : `Busy (${item.assignedOrderId || "-"})`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">Delivery Status </h2>
         
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
              <p className="text-xs text-gray-500">Current Status</p>
              <span className={`inline-flex mt-1 px-3 py-1 rounded-full text-xs font-semibold ${statusBadgeClass}`}>
                {formatStatusLabel(automatedDeliveryStatus)}
              </span>
            </div>
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
              <p className="text-xs text-gray-500">Delay</p>
              <p className="text-sm font-medium text-gray-800">
                {selectedOrder?.delayInMinutes != null ? `${selectedOrder.delayInMinutes} minutes` : "No delay"}
              </p>
            </div>
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
              <p className="text-xs text-gray-500">Latest Update</p>
              <p className="text-sm font-medium text-gray-800">{selectedOrder?.latestNotification || "-"}</p>
            </div>
          </div>
          {automatedDeliveryStatus === "RETURNED" && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              Return reason: {selectedOrder?.returnReason || "-"} | Returned quantity:{" "}
              {selectedOrder?.returnedQuantity != null ? `${selectedOrder.returnedQuantity} m3` : "-"}
            </div>
          )}
          {(automatedDeliveryStatus === "DISPATCHED" || automatedDeliveryStatus === "IN_TRANSIT") && (
            <div>
              <button
                type="button"
                onClick={() => void onMarkDelivered()}
                className="px-4 py-2 bg-green-600 text-white rounded-md"
              >
                Mark as Delivered
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Trip Records</h2>


          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="min-w-full text-sm text-left text-gray-700">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-3 py-2">Trip</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Shift</th>
                  <th className="px-3 py-2">Qty (m3)</th>
                  <th className="px-3 py-2">Vehicle</th>
                  <th className="px-3 py-2">Driver</th>
                  <th className="px-3 py-2">Dispatch / ETA</th>
                  <th className="px-3 py-2">Return</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tripRecords.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-4 text-center text-gray-500">No trip records yet</td>
                  </tr>
                )}
                {tripRecords.map((trip, index) => (
                  <tr key={trip.id ?? index}>
                    <td className="px-3 py-2">{trip.tripNumber ?? "-"}</td>
                    <td className="px-3 py-2">{trip.status ?? "-"}</td>
                    <td className="px-3 py-2">{trip.shift ?? "-"}</td>
                    <td className="px-3 py-2">{trip.tripQuantityM3 ?? "-"}</td>
                    <td className="px-3 py-2">{trip.transitMixerNumber ?? "-"}</td>
                    <td className="px-3 py-2">{trip.driverName ?? "-"}</td>
                    <td className="px-3 py-2">
                      {formatDateTimeWith12And24(trip.scheduledDispatchTime)}
                      <br />
                      <span className="text-xs text-gray-500">
                        ETA: {formatDateTimeWith12And24(trip.estimatedDeliveryTime)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {trip.returnReason ? `${trip.returnReason} (${trip.returnedQuantity ?? "-"})` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <form onSubmit={onGpsSubmit} className="bg-white rounded-2xl shadow-md p-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">Live GPS Update</h2>
          <p className="text-sm text-gray-600">
            Enter current vehicle coordinates to update customer live tracking.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="number"
              step="any"
              placeholder="Latitude (e.g. 12.9716)"
              value={gps.liveLatitude}
              onChange={(e) => setGps({ ...gps, liveLatitude: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              type="number"
              step="any"
              placeholder="Longitude (e.g. 77.5946)"
              value={gps.liveLongitude}
              onChange={(e) => setGps({ ...gps, liveLongitude: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">
            Update Live GPS
          </button>
        </form>

        {selectedOrder && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Current Scheduled Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-gray-700">
              <p><span className="font-semibold">Order:</span> {selectedOrder.orderId}</p>
              <p><span className="font-semibold">Status:</span> {selectedOrder.status}</p>
              <p><span className="font-semibold">Delivery Status:</span> {formatStatusLabel(automatedDeliveryStatus)}</p>
              <p><span className="font-semibold">Production Date:</span> {selectedOrder.productionDate || "-"}</p>
              <p>
                <span className="font-semibold">Production Slot:</span>{" "}
                {formatDateTimeWith12And24(selectedOrder.productionSlotStart)} to{" "}
                {formatDateTimeWith12And24(selectedOrder.productionSlotEnd)}
              </p>
              <p><span className="font-semibold">Plant:</span> {selectedOrder.plantAllocation || "-"}</p>
              <p><span className="font-semibold">Priority:</span> {selectedOrder.priorityLevel || "-"}</p>
              <p><span className="font-semibold">Dispatch Time:</span> {formatDateTimeWith12And24(selectedOrder.dispatchDateTime)}</p>
              <p><span className="font-semibold">Trip Plan:</span> {selectedOrder.tripPlanning || "-"}</p>
              <p><span className="font-semibold">Planned Trips:</span> {selectedOrder.plannedTrips ?? 1}</p>
              <p><span className="font-semibold">Completed Trips:</span> {selectedOrder.completedTrips ?? 0}</p>
              <p><span className="font-semibold">Delivery Sequence:</span> {selectedOrder.deliverySequence || "-"}</p>
              <p><span className="font-semibold">ETA:</span> {formatDateTimeWith12And24(selectedOrder.expectedArrivalTime)}</p>
              <p><span className="font-semibold">Mixer:</span> {selectedOrder.transitMixerNumber || "-"}</p>
              <p><span className="font-semibold">Driver:</span> {selectedOrder.driverName || "-"} ({selectedOrder.driverShift || "-"})</p>
              <p><span className="font-semibold">Live Latitude:</span> {selectedOrder.liveLatitude ?? "-"}</p>
              <p><span className="font-semibold">Live Longitude:</span> {selectedOrder.liveLongitude ?? "-"}</p>
            </div>
            <p className="mt-3 text-sm text-indigo-700">
              Latest Notification: {selectedOrder.latestNotification || "No notification"}
            </p>
          </div>
        )}
      </main>
      {dialogNode}
    </div>
  );
};

export default AdminSchedule;


