import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";

type Order = {
  id: number;
  orderId: string;
  grade: string;
  quantity: number;
  totalPrice: number;
  status: string;
  deliveredAt?: string;
  deliveryDate?: string;
  address?: string;
  userId?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
};

type PaymentRecord = {
  orderId: string;
  amount: number;
  method: string;
  paidAt: string;
  transactionId: string;
};

type Mode = "WEEKLY" | "MONTHLY" | "YEARLY";

const RATE_MAP: Record<string, number> = { M10: 4200, M15: 4600, M20: 5000, M25: 5500, M30: 6000, M35: 6500, M40: 7200, M45: 7700, M50: 8300 };
const inr = (n: number) => `Rs.${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const yearKey = (d: Date) => `${d.getFullYear()}`;
const weekKey = (d: Date) => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
};
const startForMode = (m: Mode) => {
  const now = new Date();
  if (m === "WEEKLY") return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  if (m === "MONTHLY") return new Date(now.getFullYear(), now.getMonth(), 1);
  return new Date(now.getFullYear(), 0, 1);
};
const modeLabel = (m: Mode) => (m === "WEEKLY" ? "Weekly" : m === "MONTHLY" ? "Monthly" : "Yearly");
const isDeliveredOrder = (o: Order) => String(o.status || "").trim().toUpperCase().includes("DELIVER");
const isCodMethod = (method: string) => String(method || "").trim().toUpperCase().startsWith("CASH_ON_DELIVERY");
const getMethodLabel = (method: string) => {
  const raw = String(method || "").trim().toUpperCase();
  if (raw.startsWith("UPI")) return "UPI";
  if (raw.startsWith("BANK_TRANSFER")) return "BANK TRANSFER";
  if (raw.startsWith("CASH_ON_DELIVERY")) return "CASH ON DELIVERY";
  return "OTHER";
};
const orderAmount = (o: Order) => (o.totalPrice > 0 ? o.totalPrice : (RATE_MAP[o.grade] || 0) * o.quantity);
const toDateSafe = (raw?: string) => {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

const AdminFinance = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [paymentsByOrder, setPaymentsByOrder] = useState<Record<string, PaymentRecord[]>>({});
  const [selectedCustomer, setSelectedCustomer] = useState("ALL");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [mode, setMode] = useState<Mode>("MONTHLY");
  const [gstRate, setGstRate] = useState(18);
  const [materialCostPerM3, setMaterialCostPerM3] = useState(3000);
  const [productionCostPerM3, setProductionCostPerM3] = useState(900);
  const [transportCostPerM3, setTransportCostPerM3] = useState(600);

  useEffect(() => {
    if (localStorage.getItem("role") !== "ADMIN") {
      navigate("/login");
      return;
    }
    const load = async () => {
      const res = await fetch("http://localhost:8080/api/admin/orders");
      const data = await res.json();
      const rows: Order[] = Array.isArray(data) ? data : [];
      rows.sort((a, b) => b.id - a.id);
      setOrders(rows);
      if (rows.length > 0) setSelectedOrderId(rows[0].orderId);

      const pairs = await Promise.all(
        rows.map(async (o) => {
          try {
            const r = await fetch(`http://localhost:8080/api/orders/${o.orderId}/payments`);
            if (!r.ok) return [o.orderId, [] as PaymentRecord[]] as const;
            const p = await r.json();
            return [o.orderId, Array.isArray(p) ? p as PaymentRecord[] : []] as const;
          } catch {
            return [o.orderId, [] as PaymentRecord[]] as const;
          }
        })
      );
      const map: Record<string, PaymentRecord[]> = {};
      for (const [k, v] of pairs) map[k] = v;
      setPaymentsByOrder(map);
    };
    void load();
  }, [navigate]);

  const customers = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of orders) {
      const id = o.userId != null ? String(o.userId) : `EMAIL:${o.customerEmail || "-"}`;
      const name = o.customerName?.trim() || "Unknown Customer";
      if (!map.has(id)) map.set(id, `${name}${o.customerEmail ? ` (${o.customerEmail})` : ""}`);
    }
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (selectedCustomer === "ALL") return orders;
    return orders.filter((o) => {
      const id = o.userId != null ? String(o.userId) : `EMAIL:${o.customerEmail || "-"}`;
      return id === selectedCustomer;
    });
  }, [orders, selectedCustomer]);

  useEffect(() => {
    if (!filteredOrders.some((o) => o.orderId === selectedOrderId)) {
      setSelectedOrderId(filteredOrders[0]?.orderId || "");
    }
  }, [filteredOrders, selectedOrderId]);

  const selectedOrder = filteredOrders.find((o) => o.orderId === selectedOrderId) || null;
  const subtotal = selectedOrder ? orderAmount(selectedOrder) : 0;
  const gstAmount = (subtotal * gstRate) / 100;
  const invoiceTotal = subtotal + gstAmount;

  const paymentRows = filteredOrders.map((o) => {
    const orderSubtotal = orderAmount(o);
    const orderGst = (orderSubtotal * gstRate) / 100;
    const orderPayable = orderSubtotal + orderGst;
    const records = paymentsByOrder[o.orderId] || [];
    const onlineRecords = records.filter((p) => !isCodMethod(p.method));
    const codRecords = records.filter((p) => isCodMethod(p.method));
    const hasOnline = onlineRecords.length > 0;
    const codDelivered = !hasOnline && isDeliveredOrder(o);
    const statusLabel = hasOnline || codDelivered ? "COMPLETED SUCCESSFULLY" : "PENDING";
    const paidAmount = statusLabel === "COMPLETED SUCCESSFULLY" ? orderPayable : 0;
    const outstandingAmount = Math.max(0, orderPayable - paidAmount);
    const methodLabel = hasOnline
      ? getMethodLabel(onlineRecords[0].method)
      : codRecords.length > 0
      ? "CASH ON DELIVERY"
      : "CASH ON DELIVERY";
    const completedAt = hasOnline
      ? toDateSafe(onlineRecords[0].paidAt)
      : toDateSafe(o.deliveredAt || o.deliveryDate) || (codDelivered ? new Date() : null);
    return {
      orderId: o.orderId,
      customerName: o.customerName?.trim() || "Unknown Customer",
      customerEmail: o.customerEmail || "-",
      grade: o.grade,
      quantity: o.quantity,
      methodLabel,
      statusLabel,
      payableAmount: orderPayable,
      paidAmount,
      outstandingAmount,
      paidAt: onlineRecords[0]?.paidAt || codRecords[0]?.paidAt || null,
      completedAt,
    };
  });
  const totalPayableAll = paymentRows.reduce((s, r) => s + r.payableAmount, 0);
  const totalPaidAll = paymentRows.reduce((s, r) => s + r.paidAmount, 0);
  const totalOutstandingAll = paymentRows.reduce((s, r) => s + r.outstandingAmount, 0);
  const paidAngle = totalPayableAll > 0 ? (totalPaidAll / totalPayableAll) * 360 : 0;

  const selectedPaymentRow = paymentRows.find((r) => r.orderId === selectedOrderId) || null;
  const selectedPaid = selectedPaymentRow?.paidAmount || 0;
  const outstanding = selectedPaymentRow?.outstandingAmount || 0;
  const payStatus = selectedPaymentRow?.statusLabel.replaceAll(" ", "_") || "PENDING";

  const periodStart = startForMode(mode);
  const costPerM3 = materialCostPerM3 + productionCostPerM3 + transportCostPerM3;
  const periodCompletedRows = paymentRows.filter((r) => r.statusLabel === "COMPLETED SUCCESSFULLY" && r.completedAt && r.completedAt >= periodStart);
  const periodRevenue = periodCompletedRows.reduce((s, r) => s + r.paidAmount, 0);
  const totalQty = periodCompletedRows.reduce((s, r) => s + r.quantity, 0);
  const totalCost = totalQty * costPerM3;
  const pnl = periodRevenue - totalCost;
  const pnlAbs = Math.abs(pnl);

  const weeklyRows = useMemo(() => {
    const b: Record<string, number> = {};
    for (const r of paymentRows) {
      if (r.statusLabel !== "COMPLETED SUCCESSFULLY" || !r.completedAt) continue;
      const d = r.completedAt;
      const key = weekKey(d);
      b[key] = (b[key] || 0) + r.paidAmount;
    }
    return Object.entries(b).map(([k, v]) => ({ k, v })).sort((a, b2) => b2.k.localeCompare(a.k)).slice(0, 12);
  }, [paymentRows]);
  const monthlyRows = useMemo(() => {
    const b: Record<string, number> = {};
    for (const r of paymentRows) {
      if (r.statusLabel !== "COMPLETED SUCCESSFULLY" || !r.completedAt) continue;
      const d = r.completedAt;
      const key = monthKey(d);
      b[key] = (b[key] || 0) + r.paidAmount;
    }
    return Object.entries(b).map(([k, v]) => ({ k, v })).sort((a, b2) => b2.k.localeCompare(a.k)).slice(0, 12);
  }, [paymentRows]);
  const yearlyRows = useMemo(() => {
    const b: Record<string, number> = {};
    for (const r of paymentRows) {
      if (r.statusLabel !== "COMPLETED SUCCESSFULLY" || !r.completedAt) continue;
      const d = r.completedAt;
      const key = yearKey(d);
      b[key] = (b[key] || 0) + r.paidAmount;
    }
    return Object.entries(b).map(([k, v]) => ({ k, v })).sort((a, b2) => b2.k.localeCompare(a.k)).slice(0, 6);
  }, [paymentRows]);
  const completed = filteredOrders.filter((o) => isDeliveredOrder(o));
  const completedAtByOrderId = new Map(paymentRows.map((r) => [r.orderId, r.completedAt]));
  const modeRowsMap: Record<Mode, { k: string; v: number }[]> = {
    WEEKLY: weeklyRows,
    MONTHLY: monthlyRows,
    YEARLY: yearlyRows,
  };

  const getModeSummary = (reportMode: Mode) => {
    const summaryStart = startForMode(reportMode);
    const summaryCompletedRows = paymentRows.filter((r) => r.statusLabel === "COMPLETED SUCCESSFULLY" && r.completedAt && r.completedAt >= summaryStart);
    const summaryRevenue = summaryCompletedRows.reduce((s, r) => s + r.paidAmount, 0);
    const summaryQty = summaryCompletedRows.reduce((s, r) => s + r.quantity, 0);
    const summaryCost = summaryQty * costPerM3;
    const summaryPnl = summaryRevenue - summaryCost;
    return {
      revenue: summaryRevenue,
      cost: summaryCost,
      pnl: summaryPnl,
      pnlAbs: Math.abs(summaryPnl),
      pnlLabel: summaryPnl >= 0 ? "Profit" : "Loss",
      qty: summaryQty,
      rows: summaryCompletedRows,
    };
  };

  const downloadReport = (reportMode: Mode) => {
    const rowsForMode = modeRowsMap[reportMode] || [];
    const summary = getModeSummary(reportMode);
    const pdf = new jsPDF("p", "mm", "a4");
    const now = new Date();
    pdf.setFillColor(31, 41, 55);
    pdf.rect(0, 0, 210, 28, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text(`RMC ERP ${modeLabel(reportMode)} Financial Report`, 14, 14);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`Generated: ${now.toLocaleString()}`, 14, 21);
    pdf.setTextColor(0, 0, 0);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text("Summary", 14, 36);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`Revenue: ${inr(summary.revenue)}`, 14, 44);
    pdf.text(`Cost: ${inr(summary.cost)}`, 14, 50);
    pdf.text(`${summary.pnlLabel}: ${inr(summary.pnlAbs)}`, 14, 56);
    pdf.text(`Quantity: ${summary.qty.toFixed(2)} m3`, 14, 62);

    pdf.setFont("helvetica", "bold");
    pdf.text(`${modeLabel(reportMode)} Breakdown`, 14, 74);
    pdf.setFont("helvetica", "normal");
    let y = 82;
    const maxRows = 20;
    const rowsToPrint = rowsForMode.slice(0, maxRows);
    if (rowsToPrint.length === 0) {
      pdf.text("No order records found for selected customer/period.", 14, y);
    } else {
      pdf.setFillColor(243, 244, 246);
      pdf.rect(14, y - 6, 182, 8, "F");
      pdf.setFont("helvetica", "bold");
      pdf.text(reportMode === "YEARLY" ? "Year" : reportMode === "MONTHLY" ? "Month" : "Week", 16, y);
      pdf.text("Amount", 160, y);
      y += 8;
      pdf.setFont("helvetica", "normal");
      for (const r of rowsToPrint) {
        if (y > 275) break;
        pdf.text(r.k, 16, y);
        pdf.text(inr(r.v), 160, y);
        y += 7;
      }
    }

    const detailRows = summary.rows.slice(0, 14);
    y += 8;
    if (y < 270) {
      pdf.setFont("helvetica", "bold");
      pdf.text("Detailed Payment Info", 14, y);
      y += 6;
      pdf.setFillColor(243, 244, 246);
      pdf.rect(14, y - 5, 182, 7, "F");
      pdf.setFontSize(8);
      pdf.text("Order", 16, y);
      pdf.text("Customer", 44, y);
      pdf.text("Method", 90, y);
      pdf.text("Paid", 126, y);
      pdf.text("Outst.", 150, y);
      pdf.text("Status", 170, y);
      y += 6;
      pdf.setFont("helvetica", "normal");
      for (const row of detailRows) {
        if (y > 280) break;
        pdf.text(row.orderId, 16, y);
        pdf.text(row.customerName.slice(0, 16), 44, y);
        pdf.text(row.methodLabel.slice(0, 16), 90, y);
        pdf.text(inr(row.paidAmount).slice(0, 16), 126, y);
        pdf.text(inr(row.outstandingAmount).slice(0, 16), 150, y);
        pdf.text(row.statusLabel === "COMPLETED SUCCESSFULLY" ? "DONE" : "PEND", 170, y);
        y += 6;
      }
    }
    pdf.save(`${reportMode.toLowerCase()}-report-${now.getTime()}.pdf`);
  };

  const downloadInvoice = () => {
    if (!selectedOrder) return;
    const pdf = new jsPDF("p", "mm", "a4");
    const invoiceId = `INV-${selectedOrder.orderId}`;
    pdf.setFillColor(17, 24, 39);
    pdf.rect(0, 0, 210, 34, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text("RMC ERP - PROFESSIONAL INVOICE", 14, 14);
    pdf.setFontSize(10);
    pdf.text(`Invoice ID: ${invoiceId}`, 14, 22);
    pdf.text(`Issue Date: ${new Date().toLocaleString()}`, 130, 22);
    pdf.setTextColor(0, 0, 0);

    pdf.roundedRect(14, 40, 88, 30, 2, 2);
    pdf.roundedRect(108, 40, 88, 30, 2, 2);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("Bill To", 18, 47);
    pdf.text("Order Details", 112, 47);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(`Name: ${selectedOrder.customerName?.trim() || "Unknown Customer"}`, 18, 53);
    pdf.text(`Email: ${selectedOrder.customerEmail || "-"}`, 18, 58);
    pdf.text(`Phone: ${selectedOrder.customerPhone || "-"}`, 18, 63);
    pdf.text(`Order ID: ${selectedOrder.orderId}`, 112, 53);
    pdf.text(`Grade: ${selectedOrder.grade}`, 112, 58);
    pdf.text(`Qty: ${selectedOrder.quantity} m3`, 112, 63);

    pdf.setFillColor(241, 245, 249);
    pdf.rect(14, 76, 182, 9, "F");
    pdf.setFont("helvetica", "bold");
    pdf.text("Description", 16, 82);
    pdf.text("Qty", 110, 82);
    pdf.text("Rate", 135, 82);
    pdf.text("Amount", 165, 82);
    pdf.rect(14, 85, 182, 11);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Concrete ${selectedOrder.grade}`, 16, 92);
    pdf.text(`${selectedOrder.quantity} m3`, 110, 92);
    pdf.text(inr(RATE_MAP[selectedOrder.grade] || 0), 135, 92);
    pdf.text(inr(subtotal), 165, 92);

    pdf.roundedRect(120, 103, 76, 27, 2, 2);
    pdf.text(`Subtotal: ${inr(subtotal)}`, 124, 110);
    pdf.text(`GST (${gstRate}%): ${inr(gstAmount)}`, 124, 116);
    pdf.setFont("helvetica", "bold");
    pdf.text(`Grand Total: ${inr(invoiceTotal)}`, 124, 122);
    pdf.text(`Outstanding: ${inr(outstanding)}`, 124, 128);

    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(9);
    pdf.text("Digitally Signed - Accounts Officer", 14, 146);
    pdf.text("Digitally Signed - Authorized Signatory", 116, 146);
    pdf.line(14, 142, 90, 142);
    pdf.line(116, 142, 196, 142);
    pdf.text("Computer generated invoice", 14, 152);
    pdf.save(`${invoiceId}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-gray-100 to-slate-200 flex">
      <aside className="w-64 bg-slate-900 text-white flex flex-col p-6 shadow-xl">
        <h2 className="text-2xl font-bold text-indigo-400 mb-10">Admin Panel</h2>
        <nav className="flex flex-col gap-4 text-sm font-medium">
          <button onClick={() => navigate("/admin")} className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition">Dashboard</button>
          <button onClick={() => navigate("/admin/orders")} className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition">Orders</button>
          <button onClick={() => navigate("/admin/users")} className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition">Users</button>
          <button onClick={() => navigate("/admin/adminlogins")} className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition">Admin Logins</button>
          <button onClick={() => navigate("/admin/schedule")} className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition">Schedule</button>
          <button onClick={() => navigate("/admin/inventory")} className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition">Inventory</button>
          <button onClick={() => navigate("/admin/finance")} className="text-left px-3 py-2 rounded-lg bg-slate-800">Finance</button>
          <button onClick={() => navigate("/admin/quality-control")} className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition">Quality Control</button>
          <button onClick={() => navigate("/admin/maintenance")} className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition">Maintenance</button>
          <button
            onClick={() => {
              localStorage.clear();
              navigate("/login");
            }}
            className="text-left px-3 py-2 rounded-lg text-red-300 hover:bg-slate-800 hover:text-red-200 transition"
          >
            Logout
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-8 space-y-6">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <h1 className="text-2xl font-bold text-gray-800">Finance and Accounting</h1>

        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm">
            <option value="ALL">All Customers</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} className="px-3 py-2 border border-gray-300 rounded-md text-sm">
            <option value="WEEKLY">Weekly Report</option>
            <option value="MONTHLY">Monthly Report</option>
            <option value="YEARLY">Yearly Report</option>
          </select>
          <input type="number" value={gstRate} onChange={(e) => setGstRate(Number(e.target.value) || 0)} className="px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="GST %" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl shadow-md p-5"><p className="text-xs text-gray-500">{mode} Collected Revenue</p><p className="text-2xl font-bold text-indigo-700">{inr(periodRevenue)}</p></div>
          <div className="bg-white rounded-2xl shadow-md p-5"><p className="text-xs text-gray-500">Customers</p><p className="text-2xl font-bold text-slate-700">{customers.length}</p></div>
          <div className="bg-white rounded-2xl shadow-md p-5"><p className="text-xs text-gray-500">Estimated Cost</p><p className="text-2xl font-bold text-gray-700">{inr(totalCost)}</p></div>
          <div className="bg-white rounded-2xl shadow-md p-5"><p className="text-xs text-gray-500">Profit / Loss</p><p className={`text-2xl font-bold ${pnl >= 0 ? "text-emerald-700" : "text-red-700"}`}>{pnl >= 0 ? `Profit ${inr(pnlAbs)}` : `Loss ${inr(pnlAbs)}`}</p></div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Payment Completion Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="flex justify-center">
              <div
                className="h-36 w-36 rounded-full border border-slate-200"
                style={{
                  background:
                    totalPayableAll <= 0
                      ? "conic-gradient(#e5e7eb 0deg 360deg)"
                      : `conic-gradient(#0f766e 0deg ${paidAngle}deg, #cbd5e1 ${paidAngle}deg 360deg)`,
                }}
              />
            </div>
            <div className="md:col-span-2 text-sm text-gray-700 space-y-1">
              <p><span className="inline-block w-2.5 h-2.5 bg-teal-700 rounded-full mr-2" />Collected: <b>{inr(totalPaidAll)}</b></p>
              <p><span className="inline-block w-2.5 h-2.5 bg-slate-300 rounded-full mr-2" />Outstanding: <b>{inr(totalOutstandingAll)}</b></p>
              <p>Total Payable: <b>{inr(totalPayableAll)}</b></p>

            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white rounded-2xl shadow-md p-6 space-y-3">
            <h2 className="text-lg font-semibold text-gray-800">Invoice Management (Customer-wise)</h2>
            <select value={selectedOrderId} onChange={(e) => setSelectedOrderId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
              {filteredOrders.map((o) => <option key={o.id} value={o.orderId}>{o.orderId} - {o.customerName?.trim() || "Unknown Customer"} - {o.grade}</option>)}
            </select>
            {selectedOrder && (
              <div className="text-sm bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p><b>Invoice ID:</b> INV-{selectedOrder.orderId}</p>
                <p><b>Customer:</b> {selectedOrder.customerName?.trim() || "Unknown Customer"} ({selectedOrder.customerEmail || "-"})</p>
                <p><b>Grade / Qty:</b> {selectedOrder.grade} / {selectedOrder.quantity} m3</p>
                <p><b>Total:</b> {inr(invoiceTotal)} | <b>Paid:</b> {inr(selectedPaid)} | <b>Outstanding:</b> {inr(outstanding)} | <b>Status:</b> {payStatus.replaceAll("_", " ")}</p>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={downloadInvoice} className="px-4 py-2 bg-slate-700 text-white rounded-md text-sm">Download Tax Invoice PDF</button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Payment Details (UPI / Bank Transfer / Cash on Delivery)</h2>
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Order</th>
                  <th className="px-3 py-2 text-left">Customer</th>
                  <th className="px-3 py-2 text-left">Method</th>
                  <th className="px-3 py-2 text-left">Payable</th>
                  <th className="px-3 py-2 text-left">Paid</th>
                  <th className="px-3 py-2 text-left">Outstanding</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Completed At</th>
                  <th className="px-3 py-2 text-left">Paid At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paymentRows.map((row) => (
                  <tr key={row.orderId}>
                    <td className="px-3 py-2">{row.orderId}</td>
                    <td className="px-3 py-2">{row.customerName}</td>
                    <td className="px-3 py-2">{row.methodLabel}</td>
                    <td className="px-3 py-2">{inr(row.payableAmount)}</td>
                    <td className="px-3 py-2">{inr(row.paidAmount)}</td>
                    <td className="px-3 py-2">{inr(row.outstandingAmount)}</td>
                    <td className={`px-3 py-2 font-semibold ${row.statusLabel.startsWith("COMPLETED") ? "text-emerald-700" : "text-amber-700"}`}>
                      {row.statusLabel}
                    </td>
                    <td className="px-3 py-2">{row.completedAt ? row.completedAt.toLocaleString() : "-"}</td>
                    <td className="px-3 py-2">{row.paidAt ? new Date(row.paidAt).toLocaleString() : "-"}</td>
                  </tr>
                ))}
                {paymentRows.length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-gray-500" colSpan={9}>No payment records for selected customer.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Completed Delivery Details</h2>
            <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-md">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left">Order</th><th className="px-3 py-2 text-left">Customer</th><th className="px-3 py-2 text-left">Qty</th><th className="px-3 py-2 text-left">Delivered</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {completed.map((d) => <tr key={d.orderId}><td className="px-3 py-2">{d.orderId}</td><td className="px-3 py-2">{d.customerName?.trim() || "Unknown Customer"}</td><td className="px-3 py-2">{d.quantity} m3</td><td className="px-3 py-2">{(d.deliveredAt ? new Date(d.deliveredAt) : completedAtByOrderId.get(d.orderId))?.toLocaleString() || "-"}</td></tr>)}
                  {completed.length === 0 && <tr><td className="px-3 py-2 text-gray-500" colSpan={4}>No completed deliveries.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 space-y-3">
            <h2 className="text-lg font-semibold text-gray-800">Weekly / Monthly / Yearly Reports</h2>

            <div className="grid grid-cols-1 gap-4">
              {(["WEEKLY", "MONTHLY", "YEARLY"] as Mode[]).map((reportMode) => {
                const rowsForMode = modeRowsMap[reportMode] || [];
                const max = Math.max(...rowsForMode.map((x) => x.v), 1);
                const summary = getModeSummary(reportMode);
                const revenuePortion =
                  summary.revenue + summary.cost === 0
                    ? 0
                    : (summary.revenue / (summary.revenue + summary.cost)) * 360;
                return (
                  <div key={reportMode} className="border border-gray-200 rounded-md p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <p className="text-sm font-semibold text-gray-800">{modeLabel(reportMode)} Report</p>
                      <button onClick={() => downloadReport(reportMode)} className="px-3 py-1.5 bg-slate-700 text-white rounded-md text-xs">
                        Download {modeLabel(reportMode)} PDF
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-2">{modeLabel(reportMode)} Amount Chart</p>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {rowsForMode.map((r) => {
                            const width = Math.max(8, Math.round((r.v / max) * 100));
                            return (
                              <div key={r.k}>
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="text-gray-600">{r.k}</span>
                                  <span className="font-semibold text-gray-800">{inr(r.v)}</span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 rounded">
                                  <div className="h-2 bg-slate-700 rounded" style={{ width: `${width}%` }} />
                                </div>
                              </div>
                            );
                          })}
                          {rowsForMode.length === 0 && <p className="text-xs text-gray-500">No records for this period.</p>}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-2">Profit / Loss Pie</p>
                        <div className="flex items-center gap-3">
                          <div
                            className="h-20 w-20 rounded-full border border-gray-200"
                            style={{
                              background:
                                summary.revenue + summary.cost === 0
                                  ? "conic-gradient(#e5e7eb 0deg 360deg)"
                                  : `conic-gradient(#334155 0deg ${revenuePortion}deg, #cbd5e1 ${revenuePortion}deg 360deg)`,
                            }}
                          />
                          <div className="text-xs space-y-1">
                            <p>Revenue: <span className="font-semibold">{inr(summary.revenue)}</span></p>
                            <p>Cost: <span className="font-semibold">{inr(summary.cost)}</span></p>
                            <p className={summary.pnl >= 0 ? "text-emerald-700 font-semibold" : "text-red-700 font-semibold"}>
                              {summary.pnlLabel}: {inr(summary.pnlAbs)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                type="number"
                value={materialCostPerM3 === 0 ? "" : materialCostPerM3}
                onChange={(e) => setMaterialCostPerM3(Number(e.target.value) || 0)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Enter material cost per m3"
              />
              <input
                type="number"
                value={productionCostPerM3 === 0 ? "" : productionCostPerM3}
                onChange={(e) => setProductionCostPerM3(Number(e.target.value) || 0)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Enter production cost per m3"
              />
              <input
                type="number"
                value={transportCostPerM3 === 0 ? "" : transportCostPerM3}
                onChange={(e) => setTransportCostPerM3(Number(e.target.value) || 0)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Enter transport cost per m3"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminFinance;
