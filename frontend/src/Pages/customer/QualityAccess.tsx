import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { normalizeRole } from "../../utils/auth";

type QualityRow = {
  orderId: string;
  grade: string;
  status: string;
  approvedMixDesignDetails: string;
  materialProportions: string;
  slumpTestResultMm: number;
  slumpRequiredRangeMm: string;
  slumpWithinStandard: boolean;
  cubeStrength7DayMpa: number;
  cubeStrength28DayMpa: number;
  requiredStrengthMpa: number;
  cube7DayWithinStandard: boolean;
  cube28DayWithinStandard: boolean;
  qualityCertificateGenerated: boolean;
  qualityCertificateNumber?: string | null;
  qualityCertificateGeneratedAt?: string | null;
  qualityRemarks: string;
};

const QualityAccess = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<QualityRow[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const role = normalizeRole(localStorage.getItem("role"));
    const userId = localStorage.getItem("userId");
    if (role !== "CUSTOMER" || !userId) {
      navigate("/login");
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:8080/api/quality/my-orders/${userId}`);
        const data = await res.json();
        const items = Array.isArray(data) ? data : [];
        setRows(items);
        if (items.length > 0) {
          setSelectedOrderId(items[0].orderId);
        }
      } catch (error) {
        console.error("Failed to load quality access", error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [navigate]);

  const selected = useMemo(
    () => rows.find((r) => r.orderId === selectedOrderId) || null,
    [rows, selectedOrderId]
  );

  const downloadCertificate = () => {
    if (!selected || !selected.qualityCertificateGenerated) return;
    const html = `
      <html>
      <head><title>Quality Certificate ${selected.orderId}</title></head>
      <body style="font-family: Arial, sans-serif; padding: 24px;">
        <h2>RMC Quality Certificate</h2>
        <p><strong>Certificate No:</strong> ${selected.qualityCertificateNumber || "-"}</p>
        <p><strong>Order ID:</strong> ${selected.orderId}</p>
        <p><strong>Concrete Grade:</strong> ${selected.grade}</p>
        <p><strong>Mix Design:</strong> ${selected.approvedMixDesignDetails}</p>
        <p><strong>Material Proportions:</strong> ${selected.materialProportions}</p>
        <p><strong>Slump Test:</strong> ${selected.slumpTestResultMm} mm (Required ${selected.slumpRequiredRangeMm})</p>
        <p><strong>Cube Strength 7-Day:</strong> ${selected.cubeStrength7DayMpa} MPa</p>
        <p><strong>Cube Strength 28-Day:</strong> ${selected.cubeStrength28DayMpa} MPa</p>
        <p><strong>Required Strength:</strong> ${selected.requiredStrengthMpa} MPa</p>
        <p><strong>Remarks:</strong> ${selected.qualityRemarks}</p>
      </body>
      </html>
    `;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-6xl mx-auto px-6 pt-28 pb-10 space-y-6">
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800">Quality Access</h1>
          <p className="text-sm text-gray-500 mt-1">
            View approved mix design, test reports and quality certificate for your orders.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Order</label>
          {loading ? (
            <p className="text-sm text-gray-500">Loading quality records...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-gray-500">No approved quality records found yet.</p>
          ) : (
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-md"
            >
              {rows.map((r) => (
                <option key={r.orderId} value={r.orderId}>
                  {r.orderId} ({r.grade})
                </option>
              ))}
            </select>
          )}
        </div>

        {selected && (
          <>
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Mix Design Information (Read-Only)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
                <p><span className="font-semibold">Concrete Grade:</span> {selected.grade}</p>
                <p><span className="font-semibold">Order Status:</span> {selected.status}</p>
                <p><span className="font-semibold">Approved Mix Design:</span> {selected.approvedMixDesignDetails}</p>
                <p><span className="font-semibold">Material Proportions:</span> {selected.materialProportions}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Test Report Access</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="font-semibold text-gray-800 mb-1">Slump Test</p>
                  <p className="text-gray-700">Result: {selected.slumpTestResultMm} mm</p>
                  <p className="text-gray-700">Required: {selected.slumpRequiredRangeMm}</p>
                  <p className={selected.slumpWithinStandard ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                    {selected.slumpWithinStandard ? "Within Standard" : "Out of Standard"}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="font-semibold text-gray-800 mb-1">Cube Test Strength</p>
                  <p className="text-gray-700">7-Day: {selected.cubeStrength7DayMpa} MPa</p>
                  <p className="text-gray-700">28-Day: {selected.cubeStrength28DayMpa} MPa</p>
                  <p className="text-gray-700">Required: {selected.requiredStrengthMpa} MPa</p>
                  <p className={selected.cube28DayWithinStandard ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                    {selected.cube28DayWithinStandard ? "Meets Required Standard" : "Below Required Standard"}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Quality Certificate</h2>
                <button
                  onClick={downloadCertificate}
                  disabled={!selected.qualityCertificateGenerated}
                  className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm disabled:opacity-50"
                >
                  Download PDF
                </button>
              </div>
              <div className="text-sm text-gray-700 space-y-2">
                <p><span className="font-semibold">Certificate Status:</span> {selected.qualityCertificateGenerated ? "Generated" : "Pending"}</p>
                <p><span className="font-semibold">Certificate Number:</span> {selected.qualityCertificateNumber || "-"}</p>
                <p><span className="font-semibold">Generated At:</span> {selected.qualityCertificateGeneratedAt ? new Date(selected.qualityCertificateGeneratedAt).toLocaleString() : "-"}</p>
                <p><span className="font-semibold">Remarks:</span> {selected.qualityRemarks}</p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default QualityAccess;
