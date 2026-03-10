import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

type OrderRow = {
  id: number;
  orderId: string;
  grade: string;
  status: string;
  customerName?: string | null;
  latestInspection?: {
    id: number;
    inspectionNumber: string;
    compliancePassed: boolean;
    qualityCertificateGenerated: boolean;
    qualityCertificateNumber?: string | null;
    recordedAt?: string | null;
  } | null;
};

type MixDesign = {
  id: number;
  mixDesignId: string;
  grade: string;
  cement: number;
  sand: number;
  aggregate: number;
  water: number;
  admixtures: number;
  requiredStrengthMpa: number;
  slumpMinMm: number;
  slumpMaxMm: number;
  approved: boolean;
  approvalRemarks?: string | null;
  materialProportions: string;
  updatedAt?: string | null;
};

type Inspection = {
  id: number;
  inspectionNumber: string;
  orderId: string;
  grade: string;
  batchCode?: string | null;
  mixDesignId?: string | null;
  materialProportions?: string | null;
  slumpTestResultMm: number;
  slumpRequiredRangeMm: string;
  slumpWithinStandard: boolean;
  requiredStrengthMpa: number;
  cubeStrength7DayMpa: number;
  cubeStrength14DayMpa: number;
  cubeStrength28DayMpa: number;
  cube7DayWithinStandard: boolean;
  cube14DayWithinStandard: boolean;
  cube28DayWithinStandard: boolean;
  compliancePassed: boolean;
  qualityCertificateGenerated: boolean;
  qualityCertificateNumber?: string | null;
  qualityRemarks?: string | null;
  recordedAt?: string | null;
};

const API = "http://localhost:8080/api/quality";

const numberFieldClass = "w-full px-3 py-2 border border-gray-300 rounded-md text-sm";

const AdminQualityControl = () => {
  const navigate = useNavigate();
  const adminUserId = localStorage.getItem("userId") || "";

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [mixDesigns, setMixDesigns] = useState<MixDesign[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);

  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedMixDesignId, setSelectedMixDesignId] = useState("");

  const [mixForm, setMixForm] = useState({
    grade: "M20",
    cement: "1",
    sand: "1.5",
    aggregate: "3",
    water: "0.45",
    admixtures: "0",
    requiredStrengthMpa: "20",
    slumpMinMm: "75",
    slumpMaxMm: "125",
    approvalRemarks: "",
  });

  const [inspectionForm, setInspectionForm] = useState({
    batchCode: "",
    slumpTestResultMm: "",
    cubeStrength7DayMpa: "",
    cubeStrength14DayMpa: "",
    cubeStrength28DayMpa: "",
    qualityRemarks: "",
  });

  const [statusMessage, setStatusMessage] = useState("");
  const [statusError, setStatusError] = useState(false);

  const approvedMixDesigns = useMemo(
    () => mixDesigns.filter((mix) => mix.approved),
    [mixDesigns]
  );

  const qualitySummary = useMemo(() => {
    const total = inspections.length;
    const compliant = inspections.filter((item) => item.compliancePassed).length;
    const certificates = inspections.filter((item) => item.qualityCertificateGenerated).length;
    return { total, compliant, certificates };
  }, [inspections]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.orderId === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  );

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "ADMIN" || !adminUserId) {
      navigate("/login");
      return;
    }
    void loadAll();
  }, [navigate, adminUserId]);

  useEffect(() => {
    if (!selectedOrderId && orders.length > 0) {
      setSelectedOrderId(orders[0].orderId);
    }
  }, [orders, selectedOrderId]);

  useEffect(() => {
    if (!selectedOrder) {
      return;
    }
    const gradeBased = approvedMixDesigns.find((mix) => mix.grade === selectedOrder.grade);
    if (gradeBased) {
      setSelectedMixDesignId(gradeBased.mixDesignId);
    } else if (approvedMixDesigns.length > 0) {
      setSelectedMixDesignId(approvedMixDesigns[0].mixDesignId);
    }
  }, [approvedMixDesigns, selectedOrder]);

  const setMessage = (message: string, error = false) => {
    setStatusMessage(message);
    setStatusError(error);
  };

  const loadAll = async () => {
    await Promise.all([loadOrders(), loadMixDesigns(), loadInspections()]);
  };

  const loadOrders = async () => {
    const res = await fetch(`${API}/admin/orders?adminUserId=${encodeURIComponent(adminUserId)}`);
    const data: unknown = await res.json();
    setOrders(Array.isArray(data) ? (data as OrderRow[]) : []);
  };

  const loadMixDesigns = async () => {
    const res = await fetch(`${API}/admin/mix-designs?adminUserId=${encodeURIComponent(adminUserId)}`);
    const data: unknown = await res.json();
    const items = Array.isArray(data) ? (data as MixDesign[]) : [];
    items.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
    setMixDesigns(items);
  };

  const loadInspections = async () => {
    const res = await fetch(`${API}/admin/inspections?adminUserId=${encodeURIComponent(adminUserId)}`);
    const data: unknown = await res.json();
    setInspections(Array.isArray(data) ? (data as Inspection[]) : []);
  };

  const parseNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const onCreateMixDesign = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");

    const normalizedGrade = mixForm.grade.trim().toUpperCase();
    if (!/^M\d{2}$/.test(normalizedGrade)) {
      setMessage("Grade format should be like M20, M25, M30", true);
      return;
    }

    const cement = parseNumber(mixForm.cement);
    const sand = parseNumber(mixForm.sand);
    const aggregate = parseNumber(mixForm.aggregate);
    const water = parseNumber(mixForm.water);
    const admixtures = parseNumber(mixForm.admixtures);
    const requiredStrengthMpa = parseNumber(mixForm.requiredStrengthMpa);
    const slumpMinMm = parseNumber(mixForm.slumpMinMm);
    const slumpMaxMm = parseNumber(mixForm.slumpMaxMm);

    if (cement <= 0 || sand <= 0 || aggregate <= 0 || water <= 0) {
      setMessage("Cement, Sand, Aggregate and Water must be greater than 0", true);
      return;
    }
    if (admixtures < 0) {
      setMessage("Admixtures cannot be negative", true);
      return;
    }
    if (requiredStrengthMpa <= 0) {
      setMessage("Required strength must be greater than 0", true);
      return;
    }
    if (slumpMinMm < 0 || slumpMaxMm < 0) {
      setMessage("Slump values cannot be negative", true);
      return;
    }
    if (slumpMaxMm <= slumpMinMm) {
      setMessage("Slump Max must be greater than Slump Min", true);
      return;
    }

    const payload = {
      grade: normalizedGrade,
      cement,
      sand,
      aggregate,
      water,
      admixtures,
      requiredStrengthMpa,
      slumpMinMm,
      slumpMaxMm,
      approvalRemarks: mixForm.approvalRemarks,
    };

    const res = await fetch(`${API}/admin/mix-designs?adminUserId=${encodeURIComponent(adminUserId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data: { message?: string } = await res.json();
    if (!res.ok) {
      setMessage(data.message || "Unable to create mix design", true);
      return;
    }

    setMessage(data.message || "Mix design created");
    await loadMixDesigns();
  };

  const onToggleMixApproval = async (mixDesign: MixDesign, approved: boolean) => {
    setMessage("");
    const res = await fetch(
      `${API}/admin/mix-designs/${mixDesign.id}/approve?adminUserId=${encodeURIComponent(adminUserId)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approved,
          approvalRemarks: mixDesign.approvalRemarks || "",
        }),
      }
    );

    const data: { message?: string } = await res.json();
    if (!res.ok) {
      setMessage(data.message || "Unable to update approval", true);
      return;
    }

    setMessage(data.message || "Mix design updated");
    await loadMixDesigns();
  };

  const onRecordInspection = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");

    if (!selectedOrderId || !selectedMixDesignId) {
      setMessage("Select order and approved mix design before recording QC tests", true);
      return;
    }

    const payload = {
      orderId: selectedOrderId,
      mixDesignId: selectedMixDesignId,
      batchCode: inspectionForm.batchCode,
      slumpTestResultMm: parseNumber(inspectionForm.slumpTestResultMm),
      cubeStrength7DayMpa: parseNumber(inspectionForm.cubeStrength7DayMpa),
      cubeStrength14DayMpa: parseNumber(inspectionForm.cubeStrength14DayMpa),
      cubeStrength28DayMpa: parseNumber(inspectionForm.cubeStrength28DayMpa),
      qualityRemarks: inspectionForm.qualityRemarks,
    };

    const res = await fetch(`${API}/admin/inspections?adminUserId=${encodeURIComponent(adminUserId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data: { message?: string } = await res.json();
    if (!res.ok) {
      setMessage(data.message || "Unable to record inspection", true);
      return;
    }

    setMessage(data.message || "Inspection recorded successfully");
    setInspectionForm({
      batchCode: "",
      slumpTestResultMm: "",
      cubeStrength7DayMpa: "",
      cubeStrength14DayMpa: "",
      cubeStrength28DayMpa: "",
      qualityRemarks: "",
    });
    await Promise.all([loadInspections(), loadOrders()]);
  };

  const onGenerateCertificate = async (inspection: Inspection) => {
    setMessage("");
    const res = await fetch(
      `${API}/admin/inspections/${inspection.id}/certificate?adminUserId=${encodeURIComponent(adminUserId)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qualityRemarks: inspection.qualityRemarks || "" }),
      }
    );
    const data: { message?: string } = await res.json();
    if (!res.ok) {
      setMessage(data.message || "Unable to generate certificate", true);
      return;
    }

    setMessage(data.message || "Quality certificate generated");
    await Promise.all([loadInspections(), loadOrders()]);
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
          <button onClick={() => navigate("/admin/quality-control")} className="text-left px-3 py-2 rounded-lg bg-slate-800">Quality Control</button>
          <button onClick={() => navigate("/admin/maintenance")} className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition">Maintenance</button>
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

      <main className="flex-1 p-8 space-y-6">
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800">Quality Control Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Mix design approval, slump and cube test recording, and quality certificate generation.
          </p>
        </div>

        {statusMessage && (
          <div className={`rounded-lg border px-4 py-3 text-sm ${statusError ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
            {statusMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 uppercase">QC Records</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{qualitySummary.total}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 uppercase">Compliance Pass</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{qualitySummary.compliant}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 uppercase">Certificates Generated</p>
            <p className="text-2xl font-bold text-indigo-700 mt-1">{qualitySummary.certificates}</p>
          </div>
        </div>

        <section className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Mix Design Management</h2>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 mb-4 text-xs text-indigo-900">
            Enter proportion in simple ratio numbers. Example for M25:
            Cement <span className="font-semibold">1</span>, Sand <span className="font-semibold">1.2</span>,
            Aggregate <span className="font-semibold">2.8</span>, Water <span className="font-semibold">0.42</span>,
            Admixtures <span className="font-semibold">0.03</span>.
          </div>
          <form onSubmit={onCreateMixDesign} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-5">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Grade (required)</label>
              <input
                value={mixForm.grade}
                onChange={(e) => setMixForm({ ...mixForm, grade: e.target.value })}
                placeholder="M20 / M25 / M30"
                className={numberFieldClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cement ratio (required)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={mixForm.cement}
                onChange={(e) => setMixForm({ ...mixForm, cement: e.target.value })}
                placeholder="Example: 1"
                className={numberFieldClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sand ratio (required)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={mixForm.sand}
                onChange={(e) => setMixForm({ ...mixForm, sand: e.target.value })}
                placeholder="Example: 1.2"
                className={numberFieldClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Aggregate ratio (required)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={mixForm.aggregate}
                onChange={(e) => setMixForm({ ...mixForm, aggregate: e.target.value })}
                placeholder="Example: 2.8"
                className={numberFieldClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Water ratio (required)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={mixForm.water}
                onChange={(e) => setMixForm({ ...mixForm, water: e.target.value })}
                placeholder="Example: 0.42"
                className={numberFieldClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Admixtures ratio</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={mixForm.admixtures}
                onChange={(e) => setMixForm({ ...mixForm, admixtures: e.target.value })}
                placeholder="Example: 0.03"
                className={numberFieldClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Required strength (MPa)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={mixForm.requiredStrengthMpa}
                onChange={(e) => setMixForm({ ...mixForm, requiredStrengthMpa: e.target.value })}
                placeholder="Example: 25"
                className={numberFieldClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Slump min (mm)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={mixForm.slumpMinMm}
                onChange={(e) => setMixForm({ ...mixForm, slumpMinMm: e.target.value })}
                placeholder="Example: 75"
                className={numberFieldClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Slump max (mm)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={mixForm.slumpMaxMm}
                onChange={(e) => setMixForm({ ...mixForm, slumpMaxMm: e.target.value })}
                placeholder="Example: 125"
                className={numberFieldClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
              <input
                value={mixForm.approvalRemarks}
                onChange={(e) => setMixForm({ ...mixForm, approvalRemarks: e.target.value })}
                placeholder="Optional note"
                className={numberFieldClass}
              />
            </div>
            <button type="submit" className="md:col-span-5 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium">
              Create Mix Design
            </button>
          </form>

          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-3 py-2">Mix ID</th>
                  <th className="px-3 py-2">Grade</th>
                  <th className="px-3 py-2">Proportions</th>
                  <th className="px-3 py-2">Slump</th>
                  <th className="px-3 py-2">Strength</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mixDesigns.map((mix) => (
                  <tr key={mix.id}>
                    <td className="px-3 py-2 font-medium text-gray-800">{mix.mixDesignId}</td>
                    <td className="px-3 py-2">{mix.grade}</td>
                    <td className="px-3 py-2">{mix.materialProportions}</td>
                    <td className="px-3 py-2">{mix.slumpMinMm} - {mix.slumpMaxMm} mm</td>
                    <td className="px-3 py-2">{mix.requiredStrengthMpa} MPa</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${mix.approved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {mix.approved ? "APPROVED" : "PENDING"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => void onToggleMixApproval(mix, !mix.approved)}
                        className={`px-3 py-1 rounded-md text-xs font-medium ${mix.approved ? "bg-gray-700 text-white" : "bg-emerald-600 text-white"}`}
                      >
                        {mix.approved ? "Mark Pending" : "Approve"}
                      </button>
                    </td>
                  </tr>
                ))}
                {mixDesigns.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-4 text-center text-gray-500">No mix designs created yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Slump Test and Cube Test Recording</h2>

          <form onSubmit={onRecordInspection} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className={numberFieldClass}
            >
              <option value="">Select Order</option>
              {orders.map((order) => (
                <option key={order.id} value={order.orderId}>
                  {order.orderId} - {order.grade} - {order.status}
                </option>
              ))}
            </select>

            <select
              value={selectedMixDesignId}
              onChange={(e) => setSelectedMixDesignId(e.target.value)}
              className={numberFieldClass}
            >
              <option value="">Select Approved Mix Design</option>
              {approvedMixDesigns.map((mix) => (
                <option key={mix.id} value={mix.mixDesignId}>{mix.mixDesignId} - {mix.grade}</option>
              ))}
            </select>

            <input
              value={inspectionForm.batchCode}
              onChange={(e) => setInspectionForm({ ...inspectionForm, batchCode: e.target.value })}
              placeholder="Batch Code"
              className={numberFieldClass}
            />

            <input
              value={inspectionForm.slumpTestResultMm}
              onChange={(e) => setInspectionForm({ ...inspectionForm, slumpTestResultMm: e.target.value })}
              placeholder="Slump Result (mm)"
              className={numberFieldClass}
            />

            <input
              value={inspectionForm.cubeStrength7DayMpa}
              onChange={(e) => setInspectionForm({ ...inspectionForm, cubeStrength7DayMpa: e.target.value })}
              placeholder="Cube 7-day (MPa)"
              className={numberFieldClass}
            />

            <input
              value={inspectionForm.cubeStrength14DayMpa}
              onChange={(e) => setInspectionForm({ ...inspectionForm, cubeStrength14DayMpa: e.target.value })}
              placeholder="Cube 14-day (MPa)"
              className={numberFieldClass}
            />

            <input
              value={inspectionForm.cubeStrength28DayMpa}
              onChange={(e) => setInspectionForm({ ...inspectionForm, cubeStrength28DayMpa: e.target.value })}
              placeholder="Cube 28-day (MPa)"
              className={numberFieldClass}
            />

            <input
              value={inspectionForm.qualityRemarks}
              onChange={(e) => setInspectionForm({ ...inspectionForm, qualityRemarks: e.target.value })}
              placeholder="Quality Remarks"
              className={numberFieldClass}
            />

            <button type="submit" className="md:col-span-4 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium">
              Record QC Result
            </button>
          </form>
        </section>

        <section className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Quality Reports and Compliance History</h2>

          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="px-3 py-2">Inspection</th>
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Mix</th>
                  <th className="px-3 py-2">Slump</th>
                  <th className="px-3 py-2">Cube 7/14/28</th>
                  <th className="px-3 py-2">Compliance</th>
                  <th className="px-3 py-2">Certificate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inspections.map((inspection) => (
                  <tr key={inspection.id}>
                    <td className="px-3 py-2">
                      <p className="font-medium text-gray-800">{inspection.inspectionNumber}</p>
                      <p className="text-xs text-gray-500">{inspection.recordedAt ? new Date(inspection.recordedAt).toLocaleString() : "-"}</p>
                    </td>
                    <td className="px-3 py-2">{inspection.orderId}</td>
                    <td className="px-3 py-2">{inspection.mixDesignId || "-"}</td>
                    <td className="px-3 py-2">
                      {inspection.slumpTestResultMm} mm ({inspection.slumpRequiredRangeMm})
                    </td>
                    <td className="px-3 py-2">
                      {inspection.cubeStrength7DayMpa} / {inspection.cubeStrength14DayMpa} / {inspection.cubeStrength28DayMpa} MPa
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${inspection.compliancePassed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {inspection.compliancePassed ? "PASS" : "DEVIATION"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {inspection.qualityCertificateGenerated ? (
                        <p className="text-xs font-semibold text-emerald-700">{inspection.qualityCertificateNumber || "GENERATED"}</p>
                      ) : (
                        <button
                          onClick={() => void onGenerateCertificate(inspection)}
                          disabled={!inspection.compliancePassed}
                          className="px-3 py-1 rounded-md text-xs font-medium bg-indigo-600 text-white disabled:opacity-50"
                        >
                          Generate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {inspections.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-4 text-center text-gray-500">No quality inspections recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {selectedOrder && (
            <div className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
              Selected order: <span className="font-semibold">{selectedOrder.orderId}</span> ({selectedOrder.grade}) for customer {selectedOrder.customerName || "-"}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminQualityControl;
