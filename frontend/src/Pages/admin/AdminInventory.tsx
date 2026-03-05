import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type RawMaterial = {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  supplier: string;
  reorderLevel: number;
  updatedAt?: string;
};

type Movement = {
  id: number;
  material: string;
  movementType: string;
  quantity: number;
  referenceType: string;
  referenceId: string;
  note: string;
  createdAt: string;
};

type StockReport = {
  id: number;
  name: string;
  unit: string;
  currentStock: number;
  reorderLevel: number;
  totalConsumed: number;
  totalRestocked: number;
  movementCount: number;
};

type PurchaseOrder = {
  id: number;
  material: string;
  quantity: number;
  unit: string;
  supplier: string;
  status: string;
  createdAt: string;
};

type ProductStock = {
  id: number;
  name: string;
  pricePerUnit: number;
  availableQuantity: number;
  unit: string;
  createdAt: string;
  updatedAt: string;
};

const API = "http://localhost:8080/api/admin/inventory";

const AdminInventory = () => {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [alerts, setAlerts] = useState<RawMaterial[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [reportRows, setReportRows] = useState<StockReport[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<ProductStock[]>([]);

  const [period, setPeriod] = useState("daily");
  const [newMaterial, setNewMaterial] = useState({
    name: "",
    quantity: 0,
    unit: "kg",
    supplier: "",
    reorderLevel: 100,
  });
  const [newProduct, setNewProduct] = useState({
    name: "",
    pricePerUnit: 0,
    availableQuantity: 0,
    unit: "m3",
  });

  const lowStockCount = useMemo(() => alerts.length, [alerts]);

  const fetchAll = async (selectedPeriod: string) => {
    try {
      const [mRes, aRes, mvRes, rRes, poRes, pRes] = await Promise.all([
        fetch(`${API}/materials`),
        fetch(`${API}/alerts`),
        fetch(`${API}/movements?period=${selectedPeriod}`),
        fetch(`${API}/reports/stock?period=${selectedPeriod}`),
        fetch(`${API}/purchase-orders`),
        fetch(`${API}/products`),
      ]);

      const [mData, aData, mvData, rData, poData, pData] = await Promise.all([
        mRes.json(),
        aRes.json(),
        mvRes.json(),
        rRes.json(),
        poRes.json(),
        pRes.json(),
      ]);

      setMaterials(Array.isArray(mData) ? mData : []);
      setAlerts(Array.isArray(aData) ? aData : []);
      setMovements(Array.isArray(mvData) ? mvData : []);
      setReportRows(Array.isArray(rData) ? rData : []);
      setPurchaseOrders(Array.isArray(poData) ? poData : []);
      setProducts(Array.isArray(pData) ? pData : []);
    } catch (error) {
      console.error("Failed to load inventory data", error);
    }
  };

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "ADMIN") {
      navigate("/login");
      return;
    }
    void fetchAll(period);
  }, [navigate, period]);

  const createMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API}/materials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newMaterial),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "Unable to create material");
      return;
    }
    setNewMaterial({ name: "", quantity: 0, unit: "kg", supplier: "", reorderLevel: 100 });
    await fetchAll(period);
  };

  const adjustStock = async (material: RawMaterial, mode: "restock" | "consume") => {
    const qty = prompt(`Enter ${mode} quantity for ${material.name}`);
    if (!qty) return;
    const parsed = Number(qty);
    if (!parsed || parsed <= 0) {
      alert("Enter valid quantity");
      return;
    }
    const reference = prompt("Reference ID (optional)") || "";
    const note = prompt("Note (optional)") || "";

    const res = await fetch(`${API}/materials/${material.id}/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quantity: parsed,
        referenceType: mode === "consume" ? "BATCH" : "PURCHASE",
        referenceId: reference,
        note,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "Stock update failed");
      return;
    }
    await fetchAll(period);
  };

  const createPurchaseOrder = async (material: RawMaterial) => {
    const qty = prompt(`Purchase order quantity for ${material.name}`);
    if (!qty) return;
    const parsed = Number(qty);
    if (!parsed || parsed <= 0) {
      alert("Enter valid quantity");
      return;
    }
    const supplier = prompt("Supplier name", material.supplier || "") || material.supplier;

    const res = await fetch(`${API}/purchase-orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        materialId: material.id,
        quantity: parsed,
        supplier,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "Unable to initiate purchase order");
      return;
    }
    await fetchAll(period);
  };

  const createProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProduct),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "Unable to add product");
      return;
    }
    setNewProduct({ name: "", pricePerUnit: 0, availableQuantity: 0, unit: "m3" });
    await fetchAll(period);
  };

  const restockProduct = async (id: number, name: string) => {
    const qty = prompt(`Restock quantity for ${name}`);
    if (!qty) return;
    const parsed = Number(qty);
    if (!parsed || parsed <= 0) {
      alert("Enter valid quantity");
      return;
    }
    const res = await fetch(`${API}/products/${id}/restock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: parsed }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "Restock failed");
      return;
    }
    await fetchAll(period);
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
          <button onClick={() => navigate("/admin/inventory")} className="text-left px-3 py-2 rounded-lg bg-slate-800">Inventory</button>
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
          <h1 className="text-2xl font-bold text-gray-800">Inventory Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage raw materials, monitor stock, reorder alerts, and consumption reports.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-md p-5">
            <p className="text-xs uppercase tracking-wide text-gray-500">Materials</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{materials.length}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-md p-5">
            <p className="text-xs uppercase tracking-wide text-gray-500">Reorder Alerts</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{lowStockCount}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-md p-5">
            <p className="text-xs uppercase tracking-wide text-gray-500">Stock Report</p>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="mt-2 px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Concrete Product Stock (Customer Visible)</h2>
          <form onSubmit={createProduct} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <input
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              placeholder="Product Name (ex: M40)"
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              type="number"
              value={newProduct.pricePerUnit}
              onChange={(e) => setNewProduct({ ...newProduct, pricePerUnit: Number(e.target.value) })}
              placeholder="Price per unit"
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              type="number"
              value={newProduct.availableQuantity}
              onChange={(e) => setNewProduct({ ...newProduct, availableQuantity: Number(e.target.value) })}
              placeholder="Opening stock"
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">Add Product</button>
          </form>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm mb-8">
              <thead>
                <tr className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-left">Price</th>
                  <th className="px-4 py-3 text-left">Stock</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3">Rs.{p.pricePerUnit}</td>
                    <td className={`px-4 py-3 ${p.availableQuantity <= 0 ? "text-red-600 font-semibold" : ""}`}>
                      {p.availableQuantity} {p.unit}
                    </td>
                    <td className="px-4 py-3">{new Date(p.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => restockProduct(p.id, p.name)} className="px-3 py-1 text-xs bg-green-600 text-white rounded-md">
                        Restock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="text-lg font-semibold text-gray-800 mb-4">Raw Material Management</h2>
          <form onSubmit={createMaterial} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              value={newMaterial.name}
              onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
              placeholder="Material Name"
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              type="number"
              value={newMaterial.quantity}
              onChange={(e) => setNewMaterial({ ...newMaterial, quantity: Number(e.target.value) })}
              placeholder="Quantity"
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              value={newMaterial.unit}
              onChange={(e) => setNewMaterial({ ...newMaterial, unit: e.target.value })}
              placeholder="Unit"
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              value={newMaterial.supplier}
              onChange={(e) => setNewMaterial({ ...newMaterial, supplier: e.target.value })}
              placeholder="Supplier"
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <input
              type="number"
              value={newMaterial.reorderLevel}
              onChange={(e) => setNewMaterial({ ...newMaterial, reorderLevel: Number(e.target.value) })}
              placeholder="Reorder Level"
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <button type="submit" className="md:col-span-5 px-4 py-2 bg-indigo-600 text-white rounded-md">
              Add Material
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Current Stock Monitoring</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <th className="px-4 py-3 text-left">Material</th>
                  <th className="px-4 py-3 text-left">Stock</th>
                  <th className="px-4 py-3 text-left">Reorder</th>
                  <th className="px-4 py-3 text-left">Supplier</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {materials.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 font-medium">{m.name}</td>
                    <td className={`px-4 py-3 ${m.quantity < m.reorderLevel ? "text-red-600 font-semibold" : ""}`}>
                      {m.quantity} {m.unit}
                    </td>
                    <td className="px-4 py-3">{m.reorderLevel} {m.unit}</td>
                    <td className="px-4 py-3">{m.supplier || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => adjustStock(m, "restock")} className="px-3 py-1 text-xs bg-green-600 text-white rounded-md">Restock</button>
                        <button onClick={() => adjustStock(m, "consume")} className="px-3 py-1 text-xs bg-amber-600 text-white rounded-md">Consume</button>
                        <button onClick={() => createPurchaseOrder(m)} className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-md">Create PO</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Reorder Level Alerts</h2>
            {alerts.length === 0 ? (
              <p className="text-sm text-gray-500">No reorder alerts.</p>
            ) : (
              <div className="space-y-3">
                {alerts.map((a) => (
                  <div key={a.id} className="border border-red-200 bg-red-50 rounded-lg p-3">
                    <p className="font-semibold text-red-700">{a.name}</p>
                    <p className="text-sm text-red-700">
                      Current: {a.quantity} {a.unit}, Reorder: {a.reorderLevel} {a.unit}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Purchase Orders</h2>
            {purchaseOrders.length === 0 ? (
              <p className="text-sm text-gray-500">No purchase orders yet.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {purchaseOrders.map((po) => (
                  <div key={po.id} className="border border-gray-200 rounded-lg p-3 text-sm">
                    <p className="font-semibold">{po.material} - {po.quantity} {po.unit}</p>
                    <p>Supplier: {po.supplier}</p>
                    <p>Status: {po.status}</p>
                    <p>Date: {new Date(po.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Stock Reports ({period})</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <th className="px-4 py-3 text-left">Material</th>
                  <th className="px-4 py-3 text-left">Current Stock</th>
                  <th className="px-4 py-3 text-left">Consumed</th>
                  <th className="px-4 py-3 text-left">Restocked</th>
                  <th className="px-4 py-3 text-left">Movements</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reportRows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3">{r.name}</td>
                    <td className="px-4 py-3">{r.currentStock} {r.unit}</td>
                    <td className="px-4 py-3">{r.totalConsumed} {r.unit}</td>
                    <td className="px-4 py-3">{r.totalRestocked} {r.unit}</td>
                    <td className="px-4 py-3">{r.movementCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Stock Movement History</h2>
          {movements.length === 0 ? (
            <p className="text-sm text-gray-500">No stock movement in selected period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 uppercase text-xs">
                    <th className="px-4 py-3 text-left">Material</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Qty</th>
                    <th className="px-4 py-3 text-left">Reference</th>
                    <th className="px-4 py-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {movements.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-3">{m.material}</td>
                      <td className="px-4 py-3">{m.movementType}</td>
                      <td className="px-4 py-3">{m.quantity}</td>
                      <td className="px-4 py-3">{m.referenceType}{m.referenceId ? ` (${m.referenceId})` : ""}</td>
                      <td className="px-4 py-3">{new Date(m.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminInventory;
