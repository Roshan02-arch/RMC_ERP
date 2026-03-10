import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCenteredDialog } from "../../hooks/useCenteredDialog";

interface Order {
  id: number;
  orderId: string;
  status: string;
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
  scheduledDispatchTime?: string;
  actualDispatchTime?: string;
  deliveredTime?: string;
  fuelUsedLiters?: number;
  remarks?: string;
  transitMixerNumber?: string;
  driverName?: string;
}

interface MonitoringRecord {
  orderId: string;
  dispatchStatus?: string;
  vehicleId?: string;
  driverName?: string;
  plannedTrips?: number;
  completedTrips?: number;
  totalFuelUsedLiters?: number;
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
    deliverySequence: "",
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
  const [deliveryStatusForm, setDeliveryStatusForm] = useState({
    deliveryStatus: "SCHEDULED",
    delayInMinutes: "",
    delayUpdateMessage: "",
    deliveryConfirmationDetails: "",
  });
  const [tripForm, setTripForm] = useState({
    tripNumber: "1",
    status: "SCHEDULED",
    fuelUsedLiters: "",
    remarks: "",
    transitMixerNumber: "",
    driverName: "",
  });
  const [tripRecords, setTripRecords] = useState<TripRecord[]>([]);
  const [monitoringRecords, setMonitoringRecords] = useState<MonitoringRecord[]>([]);

  const [rescheduleReason, setRescheduleReason] = useState("");

  const selectedOrder = useMemo(
    () => orders.find((order) => order.orderId === selectedOrderId),
    [orders, selectedOrderId]
  );

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
      return;
    }

    setDeliveryStatusForm((prev) => ({
      ...prev,
      deliveryStatus: selectedOrder.deliveryTrackingStatusLabel || "SCHEDULED",
    }));
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
    void fetchMonitoring();
  }, [navigate]);

  useEffect(() => {
    void fetchTripRecords();
  }, [selectedOrderId]);

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
    await fetchMonitoring();
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

  const fetchMonitoring = async () => {
    const adminUserId = localStorage.getItem("userId");
    if (!adminUserId) {
      setMonitoringRecords([]);
      return;
    }

    try {
      const res = await fetch(`${API}/dispatch/monitoring?adminUserId=${encodeURIComponent(adminUserId)}`);
      if (!res.ok) {
        setMonitoringRecords([]);
        return;
      }
      const data = await res.json();
      setMonitoringRecords(Array.isArray(data?.records) ? data.records : []);
    } catch (error) {
      console.error("Failed to fetch dispatch monitoring", error);
      setMonitoringRecords([]);
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
    const plannedTrips = Number(dispatch.plannedTrips);
    await send("/schedule/dispatch", {
      ...dispatch,
      plannedTrips: Number.isFinite(plannedTrips) ? plannedTrips : 1,
    });
  };

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

  const onDeliveryStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const adminUserId = localStorage.getItem("userId");
    if (!adminUserId || !selectedOrderId) {
      await showMessage("Please login again and select an order");
      return;
    }

    const payload: Record<string, unknown> = {
      deliveryStatus: deliveryStatusForm.deliveryStatus,
      delayUpdateMessage: deliveryStatusForm.delayUpdateMessage,
      deliveryConfirmationDetails: deliveryStatusForm.deliveryConfirmationDetails,
    };

    if (deliveryStatusForm.delayInMinutes.trim() !== "") {
      payload.delayInMinutes = Number(deliveryStatusForm.delayInMinutes);
    }
    const res = await fetch(
      `${API}/orders/${selectedOrderId}/delivery-status?adminUserId=${encodeURIComponent(adminUserId)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const text = await res.text();
    let message = "";
    try {
      const body = JSON.parse(text);
      message = body.message || "";
    } catch {
      message = text;
    }
    if (!res.ok) {
      await showMessage(message || "Delivery status update failed");
      return;
    }

    await showMessage(message || "Delivery status updated");
    await fetchOrders();
    await fetchTripRecords();
    await fetchMonitoring();
  };

  const onTripSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const adminUserId = localStorage.getItem("userId");
    if (!adminUserId || !selectedOrderId) {
      await showMessage("Please login again and select an order");
      return;
    }

    const payload: Record<string, unknown> = {
      tripNumber: Number(tripForm.tripNumber),
      status: tripForm.status,
      remarks: tripForm.remarks,
      transitMixerNumber: tripForm.transitMixerNumber,
      driverName: tripForm.driverName,
    };
    if (tripForm.fuelUsedLiters.trim() !== "") payload.fuelUsedLiters = Number(tripForm.fuelUsedLiters);

    const res = await fetch(
      `${API}/orders/${selectedOrderId}/trips?adminUserId=${encodeURIComponent(adminUserId)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const text = await res.text();
    let message = "";
    try {
      const body = JSON.parse(text);
      message = body.message || "";
    } catch {
      message = text;
    }

    if (!res.ok) {
      await showMessage(message || "Failed to save trip record");
      return;
    }

    await showMessage(message || "Trip saved successfully");
    await fetchOrders();
    await fetchTripRecords();
    await fetchMonitoring();
  };

  const onReschedule = async () => {
    if (!selectedOrderId) {
      await showMessage("Please select an order");
      return;
    }
    await send("/reschedule", { ...production, ...dispatch, ...vehicle, rescheduleReason });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-64 bg-slate-900 text-white flex flex-col p-6 shadow-xl">
        <h2 className="text-2xl font-bold text-indigo-400 mb-10">Admin Panel</h2>
        <nav className="flex flex-col gap-4 text-sm font-medium">
          <button onClick={() => navigate("/admin")} className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition">Dashboard</button>
          <button onClick={() => navigate("/admin/orders")} className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition">Orders</button>
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
          <form onSubmit={onProductionSubmit} className="bg-white rounded-2xl shadow-md p-6 space-y-3">
            <h2 className="text-lg font-semibold text-gray-800">Production Scheduling</h2>
            <input type="date" value={production.productionDate} onChange={(e) => setProduction({ ...production, productionDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <input type="datetime-local" value={production.productionSlotStart} onChange={(e) => setProduction({ ...production, productionSlotStart: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <input type="datetime-local" value={production.productionSlotEnd} onChange={(e) => setProduction({ ...production, productionSlotEnd: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <input type="text" placeholder="Plant allocation" value={production.plantAllocation} onChange={(e) => setProduction({ ...production, plantAllocation: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <select value={production.priorityLevel} onChange={(e) => setProduction({ ...production, priorityLevel: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md">
              <option value="NORMAL">Normal</option>
              <option value="URGENT">Urgent</option>
            </select>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">Save Production</button>
          </form>

          <form onSubmit={onDispatchSubmit} className="bg-white rounded-2xl shadow-md p-6 space-y-3">
            <h2 className="text-lg font-semibold text-gray-800">Dispatch Scheduling</h2>
            <input type="datetime-local" value={dispatch.dispatchDateTime} onChange={(e) => setDispatch({ ...dispatch, dispatchDateTime: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
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
            <input type="text" placeholder="Site-wise delivery sequence" value={dispatch.deliverySequence} onChange={(e) => setDispatch({ ...dispatch, deliverySequence: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <input type="datetime-local" value={dispatch.expectedArrivalTime} onChange={(e) => setDispatch({ ...dispatch, expectedArrivalTime: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-md">Save Dispatch</button>
          </form>

          <form onSubmit={onVehicleSubmit} className="bg-white rounded-2xl shadow-md p-6 space-y-3">
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
            <input type="text" placeholder="Shift timing" value={vehicle.driverShift} onChange={(e) => setVehicle({ ...vehicle, driverShift: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
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
          <p className="text-sm text-gray-600">
            Availability is checked using selected order dispatch time and ETA.
          </p>
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

        <form onSubmit={onDeliveryStatusSubmit} className="bg-white rounded-2xl shadow-md p-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">Delivery Status Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select
              value={deliveryStatusForm.deliveryStatus}
              onChange={(e) => setDeliveryStatusForm({ ...deliveryStatusForm, deliveryStatus: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="SCHEDULED">Scheduled</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="DELIVERED">Delivered</option>
            </select>
            <input
              type="number"
              min={0}
              placeholder="Delay in minutes"
              value={deliveryStatusForm.delayInMinutes}
              onChange={(e) => setDeliveryStatusForm({ ...deliveryStatusForm, delayInMinutes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              type="text"
              placeholder="Delay update message"
              value={deliveryStatusForm.delayUpdateMessage}
              onChange={(e) => setDeliveryStatusForm({ ...deliveryStatusForm, delayUpdateMessage: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <textarea
            value={deliveryStatusForm.deliveryConfirmationDetails}
            onChange={(e) => setDeliveryStatusForm({ ...deliveryStatusForm, deliveryConfirmationDetails: e.target.value })}
            placeholder="Delivery confirmation details"
            className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-20"
          />
          <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-md">Update Delivery Status</button>
        </form>

        <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Trip Records and Fuel Usage</h2>

          <form onSubmit={onTripSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="number"
              min={1}
              placeholder="Trip number"
              value={tripForm.tripNumber}
              onChange={(e) => setTripForm({ ...tripForm, tripNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <select
              value={tripForm.status}
              onChange={(e) => setTripForm({ ...tripForm, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="SCHEDULED">Scheduled</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="DELIVERED">Delivered</option>
            </select>
            <input
              type="number"
              step="0.01"
              min={0}
              placeholder="Fuel used (liters)"
              value={tripForm.fuelUsedLiters}
              onChange={(e) => setTripForm({ ...tripForm, fuelUsedLiters: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              type="text"
              placeholder="Vehicle ID"
              value={tripForm.transitMixerNumber}
              onChange={(e) => setTripForm({ ...tripForm, transitMixerNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              type="text"
              placeholder="Driver name"
              value={tripForm.driverName}
              onChange={(e) => setTripForm({ ...tripForm, driverName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              type="text"
              placeholder="Remarks"
              value={tripForm.remarks}
              onChange={(e) => setTripForm({ ...tripForm, remarks: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <button type="submit" className="md:col-span-3 px-4 py-2 bg-indigo-600 text-white rounded-md">
              Save Trip Record
            </button>
          </form>

          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="min-w-full text-sm text-left text-gray-700">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-3 py-2">Trip</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Vehicle</th>
                  <th className="px-3 py-2">Driver</th>
                  <th className="px-3 py-2">Fuel (L)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tripRecords.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-gray-500">No trip records yet</td>
                  </tr>
                )}
                {tripRecords.map((trip, index) => (
                  <tr key={trip.id ?? index}>
                    <td className="px-3 py-2">{trip.tripNumber ?? "-"}</td>
                    <td className="px-3 py-2">{trip.status ?? "-"}</td>
                    <td className="px-3 py-2">{trip.transitMixerNumber ?? "-"}</td>
                    <td className="px-3 py-2">{trip.driverName ?? "-"}</td>
                    <td className="px-3 py-2">{trip.fuelUsedLiters ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Vehicle and Driver Monitoring</h2>
          <div className="space-y-2 text-sm text-gray-700 max-h-64 overflow-auto">
            {monitoringRecords.length === 0 && <p className="text-gray-500">No active dispatch monitoring data</p>}
            {monitoringRecords.map((row) => (
              <div key={row.orderId} className="border border-gray-200 rounded-lg p-3">
                <p><span className="font-semibold">Order:</span> {row.orderId}</p>
                <p><span className="font-semibold">Status:</span> {row.dispatchStatus || "-"}</p>
                <p><span className="font-semibold">Vehicle / Driver:</span> {row.vehicleId || "-"} / {row.driverName || "-"}</p>
                <p><span className="font-semibold">Trips:</span> {row.completedTrips ?? 0} / {row.plannedTrips ?? 1}</p>
                <p><span className="font-semibold">Fuel Used:</span> {row.totalFuelUsedLiters ?? 0} L</p>
              </div>
            ))}
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
              <p><span className="font-semibold">Delivery Status:</span> {selectedOrder.deliveryTrackingStatusLabel || "-"}</p>
              <p><span className="font-semibold">Production Date:</span> {selectedOrder.productionDate || "-"}</p>
              <p><span className="font-semibold">Production Slot:</span> {selectedOrder.productionSlotStart || "-"} to {selectedOrder.productionSlotEnd || "-"}</p>
              <p><span className="font-semibold">Plant:</span> {selectedOrder.plantAllocation || "-"}</p>
              <p><span className="font-semibold">Priority:</span> {selectedOrder.priorityLevel || "-"}</p>
              <p><span className="font-semibold">Dispatch Time:</span> {selectedOrder.dispatchDateTime || "-"}</p>
              <p><span className="font-semibold">Trip Plan:</span> {selectedOrder.tripPlanning || "-"}</p>
              <p><span className="font-semibold">Planned Trips:</span> {selectedOrder.plannedTrips ?? 1}</p>
              <p><span className="font-semibold">Completed Trips:</span> {selectedOrder.completedTrips ?? 0}</p>
              <p><span className="font-semibold">Fuel Used:</span> {selectedOrder.totalFuelUsedLiters ?? 0} L</p>
              <p><span className="font-semibold">Delivery Sequence:</span> {selectedOrder.deliverySequence || "-"}</p>
              <p><span className="font-semibold">ETA:</span> {selectedOrder.expectedArrivalTime || "-"}</p>
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


