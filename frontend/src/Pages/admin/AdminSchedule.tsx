import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Order {
  id: number;
  orderId: string;
  status: string;
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
}

const API = "http://localhost:8080/api/admin";

const AdminSchedule = () => {
  const navigate = useNavigate();
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

  const [rescheduleReason, setRescheduleReason] = useState("");

  const selectedOrder = useMemo(
    () => orders.find((order) => order.orderId === selectedOrderId),
    [orders, selectedOrderId]
  );

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${API}/orders`);
      const data = await res.json();
      const items = Array.isArray(data) ? data : [];
      setOrders(items);
      if (!selectedOrderId && items.length > 0) {
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

  const send = async (url: string, payload: Record<string, string>) => {
    if (!selectedOrderId) {
      alert("Please select an order");
      return false;
    }
    const res = await fetch(`${API}/orders/${selectedOrderId}${url}`, {
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
      alert(message || "Request failed");
      return false;
    }
    alert(message || "Updated successfully");
    await fetchOrders();
    return true;
  };

  const onProductionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await send("/schedule/production", production);
  };

  const onDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await send("/schedule/dispatch", dispatch);
  };

  const onVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await send("/schedule/vehicle", vehicle);
  };

  const onReschedule = async () => {
    if (!selectedOrderId) {
      alert("Please select an order");
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
            <input type="text" placeholder="Site-wise delivery sequence" value={dispatch.deliverySequence} onChange={(e) => setDispatch({ ...dispatch, deliverySequence: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <input type="datetime-local" value={dispatch.expectedArrivalTime} onChange={(e) => setDispatch({ ...dispatch, expectedArrivalTime: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-md">Save Dispatch</button>
          </form>

          <form onSubmit={onVehicleSubmit} className="bg-white rounded-2xl shadow-md p-6 space-y-3">
            <h2 className="text-lg font-semibold text-gray-800">Vehicle & Driver</h2>
            <input type="text" placeholder="Transit mixer number" value={vehicle.transitMixerNumber} onChange={(e) => setVehicle({ ...vehicle, transitMixerNumber: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <input type="text" placeholder="Driver name" value={vehicle.driverName} onChange={(e) => setVehicle({ ...vehicle, driverName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <input type="text" placeholder="Shift timing" value={vehicle.driverShift} onChange={(e) => setVehicle({ ...vehicle, driverShift: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <input type="text" placeholder="Backup mixer (optional)" value={vehicle.backupTransitMixerNumber} onChange={(e) => setVehicle({ ...vehicle, backupTransitMixerNumber: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <input type="text" placeholder="Backup driver (optional)" value={vehicle.backupDriverName} onChange={(e) => setVehicle({ ...vehicle, backupDriverName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-md">Assign Vehicle</button>
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

        {selectedOrder && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Current Scheduled Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-gray-700">
              <p><span className="font-semibold">Order:</span> {selectedOrder.orderId}</p>
              <p><span className="font-semibold">Status:</span> {selectedOrder.status}</p>
              <p><span className="font-semibold">Production Date:</span> {selectedOrder.productionDate || "-"}</p>
              <p><span className="font-semibold">Production Slot:</span> {selectedOrder.productionSlotStart || "-"} to {selectedOrder.productionSlotEnd || "-"}</p>
              <p><span className="font-semibold">Plant:</span> {selectedOrder.plantAllocation || "-"}</p>
              <p><span className="font-semibold">Priority:</span> {selectedOrder.priorityLevel || "-"}</p>
              <p><span className="font-semibold">Dispatch Time:</span> {selectedOrder.dispatchDateTime || "-"}</p>
              <p><span className="font-semibold">Trip Plan:</span> {selectedOrder.tripPlanning || "-"}</p>
              <p><span className="font-semibold">Delivery Sequence:</span> {selectedOrder.deliverySequence || "-"}</p>
              <p><span className="font-semibold">ETA:</span> {selectedOrder.expectedArrivalTime || "-"}</p>
              <p><span className="font-semibold">Mixer:</span> {selectedOrder.transitMixerNumber || "-"}</p>
              <p><span className="font-semibold">Driver:</span> {selectedOrder.driverName || "-"} ({selectedOrder.driverShift || "-"})</p>
            </div>
            <p className="mt-3 text-sm text-indigo-700">
              Latest Notification: {selectedOrder.latestNotification || "No notification"}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminSchedule;
