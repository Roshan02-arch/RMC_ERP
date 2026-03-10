import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCenteredDialog } from "../../hooks/useCenteredDialog";

type RawMaterial = {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  supplier: string;
  pricePerUnit: number;
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
const MIN_STOCK_ALERT_THRESHOLD = 5;
const CEMENT_BRANDS = [
  "UltraTech",
  "ACC",
  "Ambuja",
  "Shree Cement",
  "Dalmia Cement",
  "JK Cement",
  "Birla Cement",
  "Ramco Cement",
];
const isLowStock = (material: RawMaterial) => material.quantity <= MIN_STOCK_ALERT_THRESHOLD;
const getReorderNeed = (material: RawMaterial) =>
  Math.max(Number(material.reorderLevel || 0) - Number(material.quantity || 0), 0);
const periodLabel = (value: string) => {
  if (value === "weekly") return "Weekly";
  if (value === "monthly") return "Monthly";
  return "Daily";
};
const csvCell = (value: string | number) => {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
};

const AdminInventory = () => {
  const navigate = useNavigate();
  const { showMessage, showConfirm, showPrompt, showSelect, dialogNode } = useCenteredDialog();
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [reportRows, setReportRows] = useState<StockReport[]>([]);
  const [products, setProducts] = useState<ProductStock[]>([]);

  const [period, setPeriod] = useState("daily");
  const [newMaterial, setNewMaterial] = useState({
    name: "",
    quantity: 0,
    unit: "kg",
    pricePerUnit: 0,
    supplier: "",
    reorderLevel: 100,
  });
  const [newProduct, setNewProduct] = useState({
    name: "",
    pricePerUnit: 0,
    availableQuantity: 0,
    unit: "m3",
  });
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editingMaterialId, setEditingMaterialId] = useState<number | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);
  const [downloadingReport, setDownloadingReport] = useState(false);

  const lowStockMaterials = useMemo(
    () => materials.filter((material) => isLowStock(material)),
    [materials]
  );
  const lowStockCount = useMemo(() => lowStockMaterials.length, [lowStockMaterials]);

  const fetchAll = async (selectedPeriod: string) => {
    try {
      const [mRes, mvRes, rRes, pRes] = await Promise.all([
        fetch(`${API}/materials`),
        fetch(`${API}/movements?period=${selectedPeriod}`),
        fetch(`${API}/reports/stock?period=${selectedPeriod}`),
        fetch(`${API}/products`),
      ]);

      const [mData, mvData, rData, pData] = await Promise.all([
        mRes.json(),
        mvRes.json(),
        rRes.json(),
        pRes.json(),
      ]);

      setMaterials(Array.isArray(mData) ? mData : []);
      setMovements(Array.isArray(mvData) ? mvData : []);
      setReportRows(Array.isArray(rData) ? rData : []);
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
      await showMessage(data.message || "Unable to create material");
      return;
    }
    setNewMaterial({ name: "", quantity: 0, unit: "kg", pricePerUnit: 0, supplier: "", reorderLevel: 100 });
    await fetchAll(period);
  };

  const adjustStock = async (material: RawMaterial, mode: "restock" | "consume") => {
    const qty = await showPrompt(`Enter ${mode} quantity for ${material.name}`, {
      title: "Update Stock",
      placeholder: "Quantity",
    });
    if (!qty) return;
    const parsed = Number(qty);
    if (!parsed || parsed <= 0) {
      await showMessage("Enter valid quantity");
      return;
    }
    const reference =
      (await showPrompt("Reference ID (optional)", { title: "Reference", placeholder: "Reference ID" })) || "";
    const note = (await showPrompt("Note (optional)", { title: "Note", placeholder: "Note" })) || "";

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
      await showMessage(data.message || "Stock update failed");
      return;
    }
    await fetchAll(period);
  };

  const createPurchaseOrder = async (material: RawMaterial) => {
    const qty = await showPrompt(`Purchase order quantity for ${material.name}`, {
      title: "Create Purchase Order",
      placeholder: "Quantity",
    });
    if (!qty) return;
    const parsed = Number(qty);
    if (!parsed || parsed <= 0) {
      await showMessage("Enter valid quantity");
      return;
    }
    const isCementMaterial = material.name.trim().toLowerCase().includes("cement");
    let supplier = material.supplier || "";
    if (isCementMaterial) {
      const defaultBrand = CEMENT_BRANDS.includes(material.supplier) ? material.supplier : CEMENT_BRANDS[0];
      const selectedBrand = await showSelect("Select cement brand", CEMENT_BRANDS, {
        title: "Cement Brand",
        defaultValue: defaultBrand,
      });
      if (!selectedBrand) return;
      supplier = selectedBrand;
    } else {
      supplier =
        (await showPrompt("Supplier name", {
          title: "Supplier",
          placeholder: "Supplier name",
          defaultValue: material.supplier || "",
        })) || material.supplier;
    }

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
      await showMessage(data.message || "Unable to initiate purchase order");
      return;
    }
    await fetchAll(period);
  };

  const editMaterial = async (material: RawMaterial) => {
    const nextName = await showPrompt("Material name", {
      title: "Edit Material",
      placeholder: "Material name",
      defaultValue: material.name,
    });
    if (nextName === null) return;

    const nextQuantityRaw = await showPrompt("Current stock quantity", {
      title: "Edit Material",
      placeholder: "Current stock quantity",
      defaultValue: String(material.quantity),
    });
    if (nextQuantityRaw === null) return;

    const nextUnit = await showPrompt("Unit", {
      title: "Edit Material",
      placeholder: "Unit",
      defaultValue: material.unit,
    });
    if (nextUnit === null) return;

    const nextPriceRaw = await showPrompt("Price per unit", {
      title: "Edit Material",
      placeholder: "Price per unit",
      defaultValue: String(material.pricePerUnit),
    });
    if (nextPriceRaw === null) return;

    const nextSupplier = await showPrompt("Supplier", {
      title: "Edit Material",
      placeholder: "Supplier",
      defaultValue: material.supplier || "",
    });
    if (nextSupplier === null) return;

    const nextReorderRaw = await showPrompt("Reorder level", {
      title: "Edit Material",
      placeholder: "Reorder level",
      defaultValue: String(material.reorderLevel),
    });
    if (nextReorderRaw === null) return;

    const parsedQuantity = Number(nextQuantityRaw);
    const parsedPrice = Number(nextPriceRaw);
    const parsedReorder = Number(nextReorderRaw);
    if (
      !nextName.trim() ||
      !nextUnit.trim() ||
      !Number.isFinite(parsedQuantity) ||
      parsedQuantity < 0 ||
      !Number.isFinite(parsedPrice) ||
      parsedPrice <= 0 ||
      !Number.isFinite(parsedReorder) ||
      parsedReorder < 0
    ) {
      await showMessage("Enter valid material details");
      return;
    }

    try {
      setEditingMaterialId(material.id);
      const res = await fetch(`${API}/materials/${material.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nextName.trim(),
          quantity: parsedQuantity,
          unit: nextUnit.trim(),
          pricePerUnit: parsedPrice,
          supplier: nextSupplier.trim(),
          reorderLevel: parsedReorder,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        await showMessage(data?.message || `Unable to update material (HTTP ${res.status})`);
        return;
      }
      await fetchAll(period);
      await showMessage("Material updated successfully");
    } finally {
      setEditingMaterialId(null);
    }
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
      await showMessage(data.message || "Unable to add product");
      return;
    }
    setNewProduct({ name: "", pricePerUnit: 0, availableQuantity: 0, unit: "m3" });
    await fetchAll(period);
  };

  const restockProduct = async (id: number, name: string) => {
    const qty = await showPrompt(`Restock quantity for ${name}`, {
      title: "Restock Product",
      placeholder: "Quantity",
    });
    if (!qty) return;
    const parsed = Number(qty);
    if (!parsed || parsed <= 0) {
      await showMessage("Enter valid quantity");
      return;
    }
    const res = await fetch(`${API}/products/${id}/restock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: parsed }),
    });
    const data = await res.json();
    if (!res.ok) {
      await showMessage(data.message || "Restock failed");
      return;
    }
    await fetchAll(period);
  };

  const editProduct = async (product: ProductStock) => {
    const nextName = await showPrompt("Product name", {
      title: "Edit Product",
      placeholder: "Product name",
      defaultValue: product.name,
    });
    if (nextName === null) return;

    const nextPriceRaw = await showPrompt("Price per unit", {
      title: "Edit Product",
      placeholder: "Price per unit",
      defaultValue: String(product.pricePerUnit),
    });
    if (nextPriceRaw === null) return;

    const nextStockRaw = await showPrompt("Available stock", {
      title: "Edit Product",
      placeholder: "Available stock",
      defaultValue: String(product.availableQuantity),
    });
    if (nextStockRaw === null) return;

    const nextUnit = await showPrompt("Unit", {
      title: "Edit Product",
      placeholder: "Unit",
      defaultValue: product.unit,
    });
    if (nextUnit === null) return;

    const parsedPrice = Number(nextPriceRaw);
    const parsedStock = Number(nextStockRaw);
    if (!nextName.trim() || !nextUnit.trim() || !Number.isFinite(parsedPrice) || parsedPrice <= 0 || !Number.isFinite(parsedStock) || parsedStock < 0) {
      await showMessage("Enter valid product details");
      return;
    }

    try {
      setEditingProductId(product.id);
      const payload = {
        name: nextName.trim(),
        pricePerUnit: parsedPrice,
        availableQuantity: parsedStock,
        unit: nextUnit.trim(),
      };

      let res = await fetch(`${API}/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok && (res.status === 404 || res.status === 405)) {
        res = await fetch(`${API}/products/${product.id}/update`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        await showMessage(data?.message || `Unable to update product (HTTP ${res.status})`);
        return;
      }
      await fetchAll(period);
      await showMessage(data?.message || "Product updated successfully");
    } finally {
      setEditingProductId(null);
    }
  };

  const deleteProduct = async (product: ProductStock) => {
    const confirmed = await showConfirm(
      `Delete product ${product.name}?`,
      "Confirm Delete",
      "Delete"
    );
    if (!confirmed) return;

    try {
      setDeletingProductId(product.id);
      let res = await fetch(`${API}/products/${product.id}`, {
        method: "DELETE",
      });
      if (!res.ok && (res.status === 404 || res.status === 405)) {
        res = await fetch(`${API}/products/${product.id}/delete`, {
          method: "POST",
        });
      }
      if (!res.ok && res.status === 404) {
        res = await fetch(`http://localhost:8080/api/inventory/products/${product.id}`, {
          method: "DELETE",
        });
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        await showMessage(data?.message || `Unable to delete product (HTTP ${res.status})`);
        return;
      }
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      await showMessage(data?.message || "Product deleted successfully");
    } finally {
      setDeletingProductId(null);
    }
  };

  const downloadStockReport = () => {
    try {
      setDownloadingReport(true);
      const now = new Date();
      const start = new Date(now);
      if (period === "weekly") {
        start.setDate(now.getDate() - 6);
      } else if (period === "monthly") {
        start.setDate(1);
      }

      const headerRows = [
        `Report Type,Stock Report`,
        `Period,${periodLabel(period)}`,
        `From,${start.toLocaleDateString()}`,
        `To,${now.toLocaleDateString()}`,
        `Generated At,${now.toLocaleString()}`,
        ``,
        `Stock Summary`,
        `Material,Current Stock,Consumed,Restocked,Movements`,
      ];

      const summaryRows = reportRows.map((row) =>
        [
          csvCell(row.name),
          csvCell(`${row.currentStock} ${row.unit}`),
          csvCell(`${row.totalConsumed} ${row.unit}`),
          csvCell(`${row.totalRestocked} ${row.unit}`),
          csvCell(row.movementCount),
        ].join(",")
      );

      const movementHeader = [
        ``,
        `Stock Movement Details`,
        `Material,Type,Qty,Reference,Date`,
      ];

      const movementRows =
        movements.length === 0
          ? ["No movement records found for selected period"]
          : movements.map((movement) =>
              [
                csvCell(movement.material),
                csvCell(movement.movementType),
                csvCell(movement.quantity),
                csvCell(
                  `${movement.referenceType || ""}${
                    movement.referenceId ? ` (${movement.referenceId})` : ""
                  }`
                ),
                csvCell(new Date(movement.createdAt).toLocaleString()),
              ].join(",")
            );

      const csvContent = [...headerRows, ...summaryRows, ...movementHeader, ...movementRows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `stock-report-${period}-${now.toISOString().slice(0, 10)}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setDownloadingReport(false);
    }
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
          <button onClick={() => navigate("/admin/finance")} className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition">Finance</button>
          <button onClick={() => navigate("/admin/quality-control")} className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition">Quality Control</button>
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

        {lowStockMaterials.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4">
            <p className="font-semibold">Restock Alert</p>
            <p className="text-sm mt-1">
              {lowStockMaterials.length} material(s) are at or below stock 5. Please reorder now.
            </p>
          </div>
        )}

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
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => editProduct(p)}
                          disabled={editingProductId === p.id}
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md disabled:opacity-60"
                        >
                          {editingProductId === p.id ? "Editing..." : "Edit"}
                        </button>
                        <button
                          onClick={() => restockProduct(p.id, p.name)}
                          className="px-3 py-1 text-xs bg-green-600 text-white rounded-md"
                        >
                          Restock
                        </button>
                        <button
                          onClick={() => deleteProduct(p)}
                          disabled={deletingProductId === p.id}
                          className="px-3 py-1 text-xs bg-red-600 text-white rounded-md disabled:opacity-60"
                        >
                          {deletingProductId === p.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="text-lg font-semibold text-gray-800 mb-4">Raw Material Management</h2>
          <form onSubmit={createMaterial} className="grid grid-cols-1 md:grid-cols-6 gap-3">
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
              type="number"
              value={newMaterial.pricePerUnit}
              onChange={(e) => setNewMaterial({ ...newMaterial, pricePerUnit: Number(e.target.value) })}
              placeholder="Price per unit"
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
            <button type="submit" className="md:col-span-6 px-4 py-2 bg-indigo-600 text-white rounded-md">
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
                  <th className="px-4 py-3 text-left">Price</th>
                  <th className="px-4 py-3 text-left">Supplier</th>
                  <th className="px-4 py-3 text-left">Alert</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {materials.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 font-medium">{m.name}</td>
                    <td className={`px-4 py-3 ${isLowStock(m) ? "text-red-600 font-semibold" : ""}`}>
                      {m.quantity} {m.unit}
                    </td>
                    <td className="px-4 py-3">{getReorderNeed(m)} {m.unit}</td>
                    <td className="px-4 py-3">Rs.{m.pricePerUnit} / {m.unit}</td>
                    <td className="px-4 py-3">{m.supplier || "-"}</td>
                    <td className="px-4 py-3">
                      {isLowStock(m) ? (
                        <span className="text-xs font-semibold text-red-600">
                          Restock now (stock &lt;= 5)
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-green-600">Stock healthy</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => editMaterial(m)}
                          disabled={editingMaterialId === m.id}
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md disabled:opacity-60"
                        >
                          {editingMaterialId === m.id ? "Editing..." : "Edit"}
                        </button>
                        <button onClick={() => adjustStock(m, "restock")} className="px-3 py-1 text-xs bg-green-600 text-white rounded-md">Restock</button>
                        <button onClick={() => adjustStock(m, "consume")} className="px-3 py-1 text-xs bg-amber-600 text-white rounded-md">Consume</button>
                        <button onClick={() => createPurchaseOrder(m)} className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-md">Reorder</button>
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
            {lowStockMaterials.length === 0 ? (
              <p className="text-sm text-gray-500">No reorder alerts.</p>
            ) : (
              <div className="space-y-3">
                {lowStockMaterials.map((a) => (
                  <div key={a.id} className="border border-red-200 bg-red-50 rounded-lg p-3">
                    <p className="font-semibold text-red-700">{a.name}</p>
                    <p className="text-sm text-red-700">
                      Current: {a.quantity} {a.unit}, Minimum: {a.reorderLevel} {a.unit}
                    </p>
                    <button
                      onClick={() => createPurchaseOrder(a)}
                      className="mt-2 px-3 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded-md"
                    >
                      Reorder
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
            <h2 className="text-lg font-semibold text-gray-800">
              Stock Reports ({periodLabel(period).toLowerCase()})
            </h2>
            <div className="flex items-center gap-2">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <button
                type="button"
                onClick={downloadStockReport}
                disabled={downloadingReport}
                className="px-3 py-2 text-sm rounded-md bg-slate-800 text-white disabled:opacity-60"
              >
                {downloadingReport ? "Preparing..." : "Download Report"}
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Download includes period-wise stock summary and movement dates as per placed updates/orders.
          </p>
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
      {dialogNode}
    </div>
  );
};

export default AdminInventory;
