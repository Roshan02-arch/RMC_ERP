import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import { normalizeRole } from "../../utils/auth";
import gorakhSignature from "../../assets/gorakh-signature.svg";

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

const statusTone = (ok: boolean) =>
  ok
    ? "bg-emerald-100 text-emerald-700 border-emerald-300"
    : "bg-rose-100 text-rose-700 border-rose-300";

const getSignatureImageDataUrl = async (): Promise<string | null> => {
  return await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = gorakhSignature;
  });
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

  const downloadCertificate = async () => {
    if (!selected || !selected.qualityCertificateGenerated) return;

    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const signatureImage = await getSignatureImageDataUrl();
      let y = 16;

      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, 210, 34, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.text("RMC QUALITY COMPLIANCE CERTIFICATE", 14, 14);
      pdf.setFontSize(10);
      pdf.text("Ready Mix Concrete Test and Approval Document", 14, 21);
      pdf.text(`Certificate No: ${selected.qualityCertificateNumber || "-"}`, 14, 27);

      pdf.setTextColor(20, 20, 20);
      y = 44;
      pdf.setFontSize(11);
      pdf.text(`Order ID: ${selected.orderId}`, 14, y);
      pdf.text(`Grade: ${selected.grade}`, 80, y);
      pdf.text(`Status: ${selected.status}`, 130, y);
      y += 8;
      pdf.text(
        `Generated At: ${
          selected.qualityCertificateGeneratedAt
            ? new Date(selected.qualityCertificateGeneratedAt).toLocaleString()
            : "-"
        }`,
        14,
        y
      );

      y += 12;
      pdf.setFontSize(12);
      pdf.text("Mix Design", 14, y);
      y += 7;
      pdf.setFontSize(10);
      pdf.text(`Approved Mix: ${selected.approvedMixDesignDetails}`, 14, y);
      y += 6;
      pdf.text(`Material Proportions: ${selected.materialProportions}`, 14, y);

      y += 10;
      pdf.setFontSize(12);
      pdf.text("Test Results", 14, y);
      y += 7;
      pdf.setFontSize(10);
      pdf.text(
        `Slump Test: ${selected.slumpTestResultMm} mm (Required ${selected.slumpRequiredRangeMm}) - ${
          selected.slumpWithinStandard ? "Within Standard" : "Out of Standard"
        }`,
        14,
        y
      );
      y += 6;
      pdf.text(
        `Cube Strength 7-Day: ${selected.cubeStrength7DayMpa} MPa - ${
          selected.cube7DayWithinStandard ? "Within Standard" : "Below Standard"
        }`,
        14,
        y
      );
      y += 6;
      pdf.text(
        `Cube Strength 28-Day: ${selected.cubeStrength28DayMpa} MPa (Required ${selected.requiredStrengthMpa} MPa) - ${
          selected.cube28DayWithinStandard ? "Meets Standard" : "Below Standard"
        }`,
        14,
        y
      );

      y += 12;
      pdf.setFontSize(12);
      pdf.text("Quality Remarks", 14, y);
      y += 7;
      pdf.setFontSize(10);
      pdf.text(selected.qualityRemarks || "-", 14, y);

      y += 18;
      pdf.setDrawColor(140, 140, 140);
      pdf.line(14, y, 82, y);
      pdf.line(120, y, 188, y);
      if (signatureImage) {
        pdf.addImage(signatureImage, "PNG", 14, y - 13, 42, 12);
        pdf.addImage(signatureImage, "PNG", 120, y - 13, 42, 12);
      }

      pdf.save(`Quality_Certificate_${selected.orderId}.pdf`);
    } catch (error) {
      console.error("Certificate PDF download failed", error);
      alert("Unable to download certificate right now.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-cyan-50 to-teal-100">
      <main className="max-w-6xl mx-auto px-6 pt-28 pb-10 space-y-6">
        <section className="rounded-3xl bg-slate-900 text-white p-8 shadow-xl">
          <p className="text-xs uppercase tracking-[0.32em] text-cyan-300">RMC ERP</p>
          <h1 className="text-3xl font-bold mt-2">Quality Certificate Center</h1>
          <p className="text-slate-300 mt-2 text-sm">
            Professional quality documents for approved mix design and concrete test records.
          </p>
        </section>

        <section className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
          <label className="block text-sm font-medium text-slate-700 mb-2">Select Order</label>
          {loading ? (
            <p className="text-sm text-slate-500">Loading quality records...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-500">No approved quality records found yet.</p>
          ) : (
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="w-full md:w-[420px] px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              {rows.map((r) => (
                <option key={r.orderId} value={r.orderId}>
                  {r.orderId} ({r.grade})
                </option>
              ))}
            </select>
          )}
        </section>

        {selected && (
          <>
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
                <p className="text-xs uppercase tracking-wide text-slate-500">Order ID</p>
                <p className="text-xl font-bold text-slate-800 mt-2">{selected.orderId}</p>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
                <p className="text-xs uppercase tracking-wide text-slate-500">Concrete Grade</p>
                <p className="text-xl font-bold text-slate-800 mt-2">{selected.grade}</p>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-md border border-slate-100">
                <p className="text-xs uppercase tracking-wide text-slate-500">Certificate Status</p>
                <p className={`text-xl font-bold mt-2 ${selected.qualityCertificateGenerated ? "text-emerald-600" : "text-amber-600"}`}>
                  {selected.qualityCertificateGenerated ? "GENERATED" : "PENDING"}
                </p>
              </div>
            </section>

            <section className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-900 to-cyan-900 text-white px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">RMC Quality Certificate</h2>
                  <p className="text-xs text-cyan-200 mt-1">
                    Certificate No: {selected.qualityCertificateNumber || "-"}
                  </p>
                </div>
                <button
                  onClick={downloadCertificate}
                  disabled={!selected.qualityCertificateGenerated}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-900 font-semibold text-sm transition"
                >
                  Download Certificate PDF
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
                  <p><span className="font-semibold">Order Status:</span> {selected.status}</p>
                  <p>
                    <span className="font-semibold">Generated At:</span>{" "}
                    {selected.qualityCertificateGeneratedAt
                      ? new Date(selected.qualityCertificateGeneratedAt).toLocaleString()
                      : "-"}
                  </p>
                  <p><span className="font-semibold">Approved Mix Design:</span> {selected.approvedMixDesignDetails}</p>
                  <p><span className="font-semibold">Material Proportions:</span> {selected.materialProportions}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                    <p className="font-semibold text-slate-800 mb-2">Slump Test Report</p>
                    <p className="text-sm text-slate-700">Result: {selected.slumpTestResultMm} mm</p>
                    <p className="text-sm text-slate-700">Required: {selected.slumpRequiredRangeMm}</p>
                    <p className={`mt-2 inline-block px-3 py-1 text-xs font-semibold rounded-full border ${statusTone(selected.slumpWithinStandard)}`}>
                      {selected.slumpWithinStandard ? "Within Standard" : "Out of Standard"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                    <p className="font-semibold text-slate-800 mb-2">Cube Strength Report</p>
                    <p className="text-sm text-slate-700">7-Day: {selected.cubeStrength7DayMpa} MPa</p>
                    <p className="text-sm text-slate-700">28-Day: {selected.cubeStrength28DayMpa} MPa</p>
                    <p className="text-sm text-slate-700">Required: {selected.requiredStrengthMpa} MPa</p>
                    <p className={`mt-2 inline-block px-3 py-1 text-xs font-semibold rounded-full border ${statusTone(selected.cube28DayWithinStandard)}`}>
                      {selected.cube28DayWithinStandard ? "Meets Standard" : "Below Standard"}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-cyan-700">Quality Remarks</p>
                  <p className="text-sm text-slate-700 mt-2">{selected.qualityRemarks || "-"}</p>
                </div>

                <div className="pt-6">
                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-3">
                    Signatures
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <div className="relative h-14">
                        <img
                          src={gorakhSignature}
                          alt="Signature example"
                          className="h-12 w-auto object-contain absolute left-0 bottom-[2px]"
                        />
                        <div className="absolute left-0 right-0 bottom-0 border-b border-slate-400" />
                      </div>
                    </div>
                    <div>
                      <div className="relative h-14">
                        <img
                          src={gorakhSignature}
                          alt="Signature example"
                          className="h-12 w-auto object-contain absolute left-0 bottom-[2px]"
                        />
                        <div className="absolute left-0 right-0 bottom-0 border-b border-slate-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default QualityAccess;
