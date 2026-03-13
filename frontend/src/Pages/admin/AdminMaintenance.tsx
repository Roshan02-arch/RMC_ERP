import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type DashboardStats = {
  totalSchedules: number;
  activeSchedules: number;
  openBreakdowns: number;
  lowStockParts: number;
  totalDowntimeHours: number;
  upcomingReminderCount: number;
};

type ScheduleRow = {
  id: number;
  equipmentType: string;
  machineName: string;
  maintenanceCategory: string;
  taskDescription: string;
  maintenanceDate: string;
  reminderDaysBefore: number;
  daysUntilMaintenance: number;
  reminderDue: boolean;
  status: string;
  note: string;
};

type BreakdownRow = {
  id: number;
  equipmentType: string;
  machineName: string;
  breakdownTime: string;
  breakdownDetails: string;
  assignedTechnician: string;
  status: string;
  repairCompletedAt?: string;
  repairHours: number;
  maintenanceCost: number;
  downtimeHours: number;
  note: string;
};

type SparePartRow = {
  id: number;
  partName: string;
  partNumber: string;
  quantityInStock: number;
  unit: string;
  minimumStockLevel: number;
  unitCost: number;
  lowStock: boolean;
};

type UsageRow = {
  id: number;
  partName: string;
  quantityUsed: number;
  totalCost: number;
  usedAt: string;
  note: string;
  breakdownId?: number;
  machineName: string;
};

type PerformanceSummary = {
  totalMachines: number;
  totalBreakdowns: number;
  totalDowntimeHours: number;
  totalMaintenanceCost: number;
};

type PerformanceRow = {
  machineName: string;
  equipmentType: string;
  breakdownCount: number;
  resolvedCount: number;
  totalDowntimeHours: number;
  totalMaintenanceCost: number;
  averageRepairHours: number;
  lastBreakdownAt?: string;
};

const API = "http://localhost:8080/api/admin/maintenance";

const initialDashboard: DashboardStats = {
  totalSchedules: 0,
  activeSchedules: 0,
  openBreakdowns: 0,
  lowStockParts: 0,
  totalDowntimeHours: 0,
  upcomingReminderCount: 0,
};

const AdminMaintenance = () => {
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState<DashboardStats>(initialDashboard);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [reminders, setReminders] = useState<ScheduleRow[]>([]);
  const [breakdowns, setBreakdowns] = useState<BreakdownRow[]>([]);
  const [spareParts, setSpareParts] = useState<SparePartRow[]>([]);
  const [lowStockParts, setLowStockParts] = useState<SparePartRow[]>([]);
  const [usages, setUsages] = useState<UsageRow[]>([]);
  const [performanceSummary, setPerformanceSummary] = useState<PerformanceSummary>({
    totalMachines: 0,
    totalBreakdowns: 0,
    totalDowntimeHours: 0,
    totalMaintenanceCost: 0,
  });
  const [performanceRows, setPerformanceRows] = useState<PerformanceRow[]>([]);

  const [scheduleForm, setScheduleForm] = useState({
    equipmentType: "BATCHING_PLANT",
    machineName: "",
    maintenanceCategory: "",
    taskDescription: "",
    maintenanceDate: "",
    reminderDaysBefore: "",
    note: "",
  });
  const [breakdownForm, setBreakdownForm] = useState({
    equipmentType: "BATCHING_PLANT",
    machineName: "",
    breakdownDetails: "",
    assignedTechnician: "",
    maintenanceCost: "",
    note: "",
  });
  const [sparePartForm, setSparePartForm] = useState({
    partName: "",
    partNumber: "",
    quantityInStock: "",
    unit: "pcs",
    minimumStockLevel: "",
    unitCost: "",
  });

  const [showMessageBox, setShowMessageBox] = useState(false);
  const [messageText, setMessageText] = useState("");

  const openMessage = (message: string) => {
    setMessageText(message);
    setShowMessageBox(true);
  };

  const parseResponse = async (res: Response) => {
    const raw = await res.text();
    try {
      return JSON.parse(raw);
    } catch {
      return { message: raw || "Request failed" };
    }
  };

  const formatDateTime = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  };

  const fetchAll = async () => {
    try {
      const [dashboardRes, schedulesRes, remindersRes, breakdownsRes, partsRes, alertsRes, usageRes, performanceRes] =
        await Promise.all([
          fetch(`${API}/dashboard`),
          fetch(`${API}/schedules`),
          fetch(`${API}/reminders?withinDays=7`),
          fetch(`${API}/breakdowns`),
          fetch(`${API}/spare-parts`),
          fetch(`${API}/spare-parts/alerts`),
          fetch(`${API}/spare-parts/usages`),
          fetch(`${API}/performance?days=30`),
        ]);

      const [dashboardData, schedulesData, remindersData, breakdownsData, partsData, alertsData, usageData, performanceData] =
        await Promise.all([
          dashboardRes.json(),
          schedulesRes.json(),
          remindersRes.json(),
          breakdownsRes.json(),
          partsRes.json(),
          alertsRes.json(),
          usageRes.json(),
          performanceRes.json(),
        ]);

      setDashboard({ ...initialDashboard, ...(dashboardData || {}) });
      setSchedules(Array.isArray(schedulesData) ? schedulesData : []);
      setReminders(Array.isArray(remindersData) ? remindersData : []);
      setBreakdowns(Array.isArray(breakdownsData) ? breakdownsData : []);
      setSpareParts(Array.isArray(partsData) ? partsData : []);
      setLowStockParts(Array.isArray(alertsData) ? alertsData : []);
      setUsages(Array.isArray(usageData) ? usageData : []);
      setPerformanceSummary(performanceData?.summary || {
        totalMachines: 0,
        totalBreakdowns: 0,
        totalDowntimeHours: 0,
        totalMaintenanceCost: 0,
      });
      setPerformanceRows(Array.isArray(performanceData?.rows) ? performanceData.rows : []);
    } catch (error) {
      console.error("Failed to load maintenance module", error);
      openMessage("Unable to load maintenance data");
    }
  };

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "ADMIN") {
      navigate("/login");
      return;
    }
    void fetchAll();
  }, [navigate]);

  const createSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    const reminderDaysBefore =
      scheduleForm.reminderDaysBefore.trim() === ""
        ? 2
        : Number(scheduleForm.reminderDaysBefore);

    const payload = {
      ...scheduleForm,
      reminderDaysBefore: Number.isFinite(reminderDaysBefore) ? reminderDaysBefore : 2,
    };

    const res = await fetch(`${API}/schedules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await parseResponse(res);
    if (!res.ok) {
      openMessage(data.message || "Unable to create schedule");
      return;
    }
    setScheduleForm({
      equipmentType: "BATCHING_PLANT",
      machineName: "",
      maintenanceCategory: "",
      taskDescription: "",
      maintenanceDate: "",
      reminderDaysBefore: "",
      note: "",
    });
    await fetchAll();
  };

  const markScheduleCompleted = async (id: number) => {
    const res = await fetch(`${API}/schedules/${id}/complete`, { method: "PUT" });
    const data = await parseResponse(res);
    if (!res.ok) {
      openMessage(data.message || "Unable to mark schedule complete");
      return;
    }
    await fetchAll();
  };

  const createBreakdown = async (e: React.FormEvent) => {
    e.preventDefault();
    const maintenanceCost =
      breakdownForm.maintenanceCost.trim() === ""
        ? 0
        : Number(breakdownForm.maintenanceCost);
    const payload = {
      ...breakdownForm,
      maintenanceCost: Number.isFinite(maintenanceCost) ? maintenanceCost : 0,
      breakdownTime: new Date().toISOString().slice(0, 19),
      status: "REPORTED",
    };
    const res = await fetch(`${API}/breakdowns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await parseResponse(res);
    if (!res.ok) {
      openMessage(data.message || "Unable to record breakdown");
      return;
    }
    setBreakdownForm({
      equipmentType: "BATCHING_PLANT",
      machineName: "",
      breakdownDetails: "",
      assignedTechnician: "",
      maintenanceCost: "",
      note: "",
    });
    await fetchAll();
  };

  const resolveBreakdown = async (id: number) => {
    const res = await fetch(`${API}/breakdowns/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "RESOLVED",
        repairCompletedAt: new Date().toISOString().slice(0, 19),
      }),
    });
    const data = await parseResponse(res);
    if (!res.ok) {
      openMessage(data.message || "Unable to resolve breakdown");
      return;
    }
    await fetchAll();
  };

  const createSparePart = async (e: React.FormEvent) => {
    e.preventDefault();
    const quantityInStock =
      sparePartForm.quantityInStock.trim() === ""
        ? 0
        : Number(sparePartForm.quantityInStock);
    const minimumStockLevel =
      sparePartForm.minimumStockLevel.trim() === ""
        ? 5
        : Number(sparePartForm.minimumStockLevel);
    const unitCost =
      sparePartForm.unitCost.trim() === ""
        ? 0
        : Number(sparePartForm.unitCost);

    const payload = {
      ...sparePartForm,
      quantityInStock: Number.isFinite(quantityInStock) ? quantityInStock : 0,
      minimumStockLevel: Number.isFinite(minimumStockLevel) ? minimumStockLevel : 5,
      unitCost: Number.isFinite(unitCost) ? unitCost : 0,
    };

    const res = await fetch(`${API}/spare-parts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await parseResponse(res);
    if (!res.ok) {
      openMessage(data.message || "Unable to add spare part");
      return;
    }
    setSparePartForm({
      partName: "",
      partNumber: "",
      quantityInStock: "",
      unit: "pcs",
      minimumStockLevel: "",
      unitCost: "",
    });
    await fetchAll();
  };

  const consumeSparePart = async (part: SparePartRow) => {
    const qtyText = window.prompt(`Usage quantity for ${part.partName}`, "1");
    if (!qtyText) return;
    const quantityUsed = Number(qtyText);
    if (!Number.isFinite(quantityUsed) || quantityUsed <= 0) {
      openMessage("Enter a valid usage quantity");
      return;
    }
    const note = window.prompt("Usage note (optional)", "") || "";
    const breakdownText = window.prompt("Breakdown ID (optional)", "") || "";
    const breakdownId = breakdownText.trim() ? Number(breakdownText) : undefined;

    const payload: Record<string, unknown> = { quantityUsed, note };
    if (breakdownId && Number.isFinite(breakdownId)) {
      payload.breakdownId = breakdownId;
    }

    const res = await fetch(`${API}/spare-parts/${part.id}/consume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await parseResponse(res);
    if (!res.ok) {
      openMessage(data.message || "Unable to consume spare part");
      return;
    }
    await fetchAll();
  };

  const updateMinimumStock = async (part: SparePartRow) => {
    const minText = window.prompt(`Minimum stock level for ${part.partName}`, String(part.minimumStockLevel));
    if (!minText) return;
    const minimumStockLevel = Number(minText);
    if (!Number.isFinite(minimumStockLevel) || minimumStockLevel < 0) {
      openMessage("Enter a valid minimum stock level");
      return;
    }
    const res = await fetch(`${API}/spare-parts/${part.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minimumStockLevel }),
    });
    const data = await parseResponse(res);
    if (!res.ok) {
      openMessage(data.message || "Unable to update minimum stock level");
      return;
    }
    await fetchAll();
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
          <button onClick={() => navigate("/admin/schedule")} className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition">Schedule</button>
          <button onClick={() => navigate("/admin/inventory")} className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition">Inventory</button>
          <button onClick={() => navigate("/admin/finance")} className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition">Finance</button>
          <button onClick={() => navigate("/admin/quality-control")} className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition">Quality Control</button>
          <button onClick={() => navigate("/admin/maintenance")} className="text-left px-3 py-2 rounded-lg bg-slate-800">Maintenance</button>
          <button onClick={() => { localStorage.clear(); navigate("/login"); }} className="text-left px-3 py-2 rounded-lg text-red-400 hover:bg-slate-800 hover:text-red-300 transition">Logout</button>
        </nav>
      </aside>

      <main className="flex-1 p-8 space-y-6">
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800">Maintenance Management</h1>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm"><p className="text-xs text-gray-500">Schedules</p><p className="text-2xl font-bold">{dashboard.totalSchedules}</p></div>
          <div className="bg-white rounded-xl p-4 shadow-sm"><p className="text-xs text-gray-500">Active</p><p className="text-2xl font-bold text-indigo-600">{dashboard.activeSchedules}</p></div>
          <div className="bg-white rounded-xl p-4 shadow-sm"><p className="text-xs text-gray-500">Open Breakdowns</p><p className="text-2xl font-bold text-red-600">{dashboard.openBreakdowns}</p></div>
          <div className="bg-white rounded-xl p-4 shadow-sm"><p className="text-xs text-gray-500">Low Stock Parts</p><p className="text-2xl font-bold text-amber-600">{dashboard.lowStockParts}</p></div>
          <div className="bg-white rounded-xl p-4 shadow-sm"><p className="text-xs text-gray-500">Downtime Hours</p><p className="text-2xl font-bold">{dashboard.totalDowntimeHours}</p></div>
          <div className="bg-white rounded-xl p-4 shadow-sm"><p className="text-xs text-gray-500">Reminders</p><p className="text-2xl font-bold text-emerald-600">{dashboard.upcomingReminderCount}</p></div>
        </div>

        {reminders.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <h2 className="font-semibold text-emerald-800">Upcoming Maintenance Reminders</h2>
            <div className="mt-2 text-sm text-emerald-700 space-y-1">
              {reminders.map((item) => (
                <p key={item.id}>{item.machineName} - {item.maintenanceDate} ({item.daysUntilMaintenance} day(s) left)</p>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <form onSubmit={createSchedule} className="bg-white rounded-2xl shadow-md p-6 space-y-3">
            <h2 className="text-lg font-semibold text-gray-800">Preventive Maintenance Scheduling</h2>
            <select value={scheduleForm.equipmentType} onChange={(e) => setScheduleForm({ ...scheduleForm, equipmentType: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md"><option value="BATCHING_PLANT">Batching Plant</option><option value="TRANSIT_MIXER">Transit Mixer</option><option value="EQUIPMENT">Equipment</option></select>
            <input value={scheduleForm.machineName} onChange={(e) => setScheduleForm({ ...scheduleForm, machineName: e.target.value })} placeholder="Machine Name / ID" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <input value={scheduleForm.maintenanceCategory} onChange={(e) => setScheduleForm({ ...scheduleForm, maintenanceCategory: e.target.value })} placeholder="Maintenance Category (e.g. PREVENTIVE)" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <input value={scheduleForm.taskDescription} onChange={(e) => setScheduleForm({ ...scheduleForm, taskDescription: e.target.value })} placeholder="Task Description" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <input type="date" value={scheduleForm.maintenanceDate} onChange={(e) => setScheduleForm({ ...scheduleForm, maintenanceDate: e.target.value })} placeholder="Select maintenance date" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <input type="number" min={0} value={scheduleForm.reminderDaysBefore} onChange={(e) => setScheduleForm({ ...scheduleForm, reminderDaysBefore: e.target.value })} placeholder="Reminder days before (e.g. 2)" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <textarea value={scheduleForm.note} onChange={(e) => setScheduleForm({ ...scheduleForm, note: e.target.value })} placeholder="Note (optional)" className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-20" />
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">Create Schedule</button>
          </form>

          <form onSubmit={createBreakdown} className="bg-white rounded-2xl shadow-md p-6 space-y-3">
            <h2 className="text-lg font-semibold text-gray-800">Breakdown Management</h2>
            <select value={breakdownForm.equipmentType} onChange={(e) => setBreakdownForm({ ...breakdownForm, equipmentType: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md"><option value="BATCHING_PLANT">Batching Plant</option><option value="TRANSIT_MIXER">Transit Mixer</option><option value="EQUIPMENT">Equipment</option></select>
            <input value={breakdownForm.machineName} onChange={(e) => setBreakdownForm({ ...breakdownForm, machineName: e.target.value })} placeholder="Machine Name / ID" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <input value={breakdownForm.assignedTechnician} onChange={(e) => setBreakdownForm({ ...breakdownForm, assignedTechnician: e.target.value })} placeholder="Assigned Technician" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <textarea value={breakdownForm.breakdownDetails} onChange={(e) => setBreakdownForm({ ...breakdownForm, breakdownDetails: e.target.value })} placeholder="Breakdown Details" className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-20" />
            <input type="number" min={0} step="0.01" value={breakdownForm.maintenanceCost} onChange={(e) => setBreakdownForm({ ...breakdownForm, maintenanceCost: e.target.value })} placeholder="Estimated Maintenance Cost (e.g. 5000)" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <textarea value={breakdownForm.note} onChange={(e) => setBreakdownForm({ ...breakdownForm, note: e.target.value })} placeholder="Note (optional)" className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-16" />
            <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-md">Record Breakdown</button>
          </form>

          <form onSubmit={createSparePart} className="bg-white rounded-2xl shadow-md p-6 space-y-3">
            <h2 className="text-lg font-semibold text-gray-800">Spare Parts Management</h2>
            <input value={sparePartForm.partName} onChange={(e) => setSparePartForm({ ...sparePartForm, partName: e.target.value })} placeholder="Part Name" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <input value={sparePartForm.partNumber} onChange={(e) => setSparePartForm({ ...sparePartForm, partNumber: e.target.value })} placeholder="Part Number" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <input type="number" min={0} step="0.01" value={sparePartForm.quantityInStock} onChange={(e) => setSparePartForm({ ...sparePartForm, quantityInStock: e.target.value })} placeholder="Stock Quantity (e.g. 25)" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <input value={sparePartForm.unit} onChange={(e) => setSparePartForm({ ...sparePartForm, unit: e.target.value })} placeholder="Unit (pcs, litre, etc.)" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <input type="number" min={0} step="0.01" value={sparePartForm.minimumStockLevel} onChange={(e) => setSparePartForm({ ...sparePartForm, minimumStockLevel: e.target.value })} placeholder="Minimum Stock Level (e.g. 5)" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <input type="number" min={0} step="0.01" value={sparePartForm.unitCost} onChange={(e) => setSparePartForm({ ...sparePartForm, unitCost: e.target.value })} placeholder="Unit Cost (e.g. 350)" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-md">Add Spare Part</button>
          </form>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Maintenance History</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead><tr className="bg-gray-50 text-xs uppercase text-gray-600"><th className="px-3 py-2 text-left">Machine</th><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Action</th></tr></thead>
                <tbody className="divide-y divide-gray-200">
                  {schedules.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2">{row.machineName}</td>
                      <td className="px-3 py-2">{row.maintenanceDate}</td>
                      <td className="px-3 py-2">{row.equipmentType}</td>
                      <td className="px-3 py-2">{row.status}</td>
                      <td className="px-3 py-2">{row.status !== "COMPLETED" && <button onClick={() => markScheduleCompleted(row.id)} className="px-2 py-1 text-xs bg-indigo-600 text-white rounded-md">Complete</button>}</td>
                    </tr>
                  ))}
                  {schedules.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-500">No schedules yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Breakdown Records</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead><tr className="bg-gray-50 text-xs uppercase text-gray-600"><th className="px-3 py-2 text-left">Machine</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Repair (hrs)</th><th className="px-3 py-2 text-left">Cost</th><th className="px-3 py-2 text-left">Action</th></tr></thead>
                <tbody className="divide-y divide-gray-200">
                  {breakdowns.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2">{row.machineName}</td>
                      <td className="px-3 py-2">{row.status}</td>
                      <td className="px-3 py-2">{row.repairHours}</td>
                      <td className="px-3 py-2">Rs.{row.maintenanceCost}</td>
                      <td className="px-3 py-2">{row.status !== "RESOLVED" && <button onClick={() => resolveBreakdown(row.id)} className="px-2 py-1 text-xs bg-green-600 text-white rounded-md">Resolve</button>}</td>
                    </tr>
                  ))}
                  {breakdowns.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-500">No breakdown records</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Spare Parts Inventory</h2>
            {lowStockParts.length > 0 && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4">
                {lowStockParts.length} spare part(s) are below minimum level.
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead><tr className="bg-gray-50 text-xs uppercase text-gray-600"><th className="px-3 py-2 text-left">Part</th><th className="px-3 py-2 text-left">Stock</th><th className="px-3 py-2 text-left">Min</th><th className="px-3 py-2 text-left">Cost</th><th className="px-3 py-2 text-left">Action</th></tr></thead>
                <tbody className="divide-y divide-gray-200">
                  {spareParts.map((part) => (
                    <tr key={part.id}>
                      <td className="px-3 py-2">{part.partName}</td>
                      <td className={`px-3 py-2 ${part.lowStock ? "text-red-600 font-semibold" : ""}`}>{part.quantityInStock} {part.unit}</td>
                      <td className="px-3 py-2">{part.minimumStockLevel}</td>
                      <td className="px-3 py-2">Rs.{part.unitCost}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button onClick={() => consumeSparePart(part)} className="px-2 py-1 text-xs bg-indigo-600 text-white rounded-md">Consume</button>
                          <button onClick={() => updateMinimumStock(part)} className="px-2 py-1 text-xs bg-slate-700 text-white rounded-md">Set Min</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {spareParts.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-500">No spare parts found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Spare Part Usage History</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead><tr className="bg-gray-50 text-xs uppercase text-gray-600"><th className="px-3 py-2 text-left">Part</th><th className="px-3 py-2 text-left">Qty</th><th className="px-3 py-2 text-left">Cost</th><th className="px-3 py-2 text-left">Machine</th><th className="px-3 py-2 text-left">Used At</th></tr></thead>
                <tbody className="divide-y divide-gray-200">
                  {usages.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2">{row.partName}</td>
                      <td className="px-3 py-2">{row.quantityUsed}</td>
                      <td className="px-3 py-2">Rs.{row.totalCost}</td>
                      <td className="px-3 py-2">{row.machineName}</td>
                      <td className="px-3 py-2">{formatDateTime(row.usedAt)}</td>
                    </tr>
                  ))}
                  {usages.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-500">No usage records</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Equipment Performance Monitoring (30 days)</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Machines</p><p className="text-xl font-bold">{performanceSummary.totalMachines}</p></div>
            <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Breakdowns</p><p className="text-xl font-bold">{performanceSummary.totalBreakdowns}</p></div>
            <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Downtime Hours</p><p className="text-xl font-bold">{performanceSummary.totalDowntimeHours}</p></div>
            <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">Maintenance Cost</p><p className="text-xl font-bold">Rs.{performanceSummary.totalMaintenanceCost}</p></div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="bg-gray-50 text-xs uppercase text-gray-600"><th className="px-3 py-2 text-left">Machine</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-left">Breakdowns</th><th className="px-3 py-2 text-left">Resolved</th><th className="px-3 py-2 text-left">Downtime</th><th className="px-3 py-2 text-left">Avg Repair</th><th className="px-3 py-2 text-left">Last Breakdown</th></tr></thead>
              <tbody className="divide-y divide-gray-200">
                {performanceRows.map((row) => (
                  <tr key={row.machineName}>
                    <td className="px-3 py-2">{row.machineName}</td>
                    <td className="px-3 py-2">{row.equipmentType || "-"}</td>
                    <td className="px-3 py-2">{row.breakdownCount}</td>
                    <td className="px-3 py-2">{row.resolvedCount}</td>
                    <td className="px-3 py-2">{row.totalDowntimeHours} hrs</td>
                    <td className="px-3 py-2">{row.averageRepairHours} hrs</td>
                    <td className="px-3 py-2">{formatDateTime(row.lastBreakdownAt)}</td>
                  </tr>
                ))}
                {performanceRows.length === 0 && <tr><td colSpan={7} className="px-3 py-4 text-center text-gray-500">No performance records</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showMessageBox && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800">Message</h3>
            <p className="text-sm text-gray-700 mt-2">{messageText}</p>
            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => setShowMessageBox(false)} className="px-4 py-2 text-sm rounded-md bg-gray-900 hover:bg-gray-800 text-white">OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMaintenance;
