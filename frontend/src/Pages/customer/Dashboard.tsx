import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaCheckCircle, FaClock, FaShoppingCart } from "react-icons/fa";
import { normalizeRole } from "../../utils/auth";

interface Order {
  id: number;
  orderId: string;
  grade: string;
  quantity: number;
  status: string;
  deliveryTrackingStatus?: string;
  paymentOption?: string;
  creditApprovalStatus?: string;
  creditDays?: number;
}

interface QualityStatus {
  orderId: string;
  qualityCertificateGenerated: boolean;
  cube28DayWithinStandard: boolean;
  slumpWithinStandard: boolean;
}

const getDashboardStatus = (order: Order) => {
  const tracking = String(order.deliveryTrackingStatus || "").trim().toUpperCase();
  if (tracking === "SCHEDULED_FOR_DISPATCH") return "SCHEDULED";
  if (tracking === "ON_THE_WAY") return "IN_TRANSIT";
  if (tracking) return tracking;
  return String(order.status || "").trim().toUpperCase();
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [qualityRows, setQualityRows] = useState<QualityStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const role = normalizeRole(localStorage.getItem("role"));
    const userId = localStorage.getItem("userId");

    if (role !== "CUSTOMER") {
      navigate("/login");
      return;
    }
    if (!userId) {
      navigate("/login");
      return;
    }

    fetch(`http://localhost:8080/api/orders/my-orders/${userId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch orders");
        }
        return res.json();
      })
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Fetch error:", err));

    fetch(`http://localhost:8080/api/quality/my-orders/${userId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch quality records");
        }
        return res.json();
      })
      .then((data) => setQualityRows(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Quality fetch error:", err));
  }, [navigate]);

  const total = orders.length;
  const pending = orders.filter((order) => getDashboardStatus(order) === "PENDING_APPROVAL").length;
  const delivered = orders.filter((order) => getDashboardStatus(order) === "DELIVERED").length;
  const filteredOrders = orders.filter((order) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;
    return (
      (order.orderId || "").toLowerCase().includes(query) ||
      (order.grade || "").toLowerCase().includes(query) ||
      String(order.quantity ?? "").toLowerCase().includes(query) ||
      (order.status || "").toLowerCase().includes(query) ||
      (order.deliveryTrackingStatus || "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-7xl mx-auto px-6 pt-24 pb-10">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Welcome Customer</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="group bg-white rounded-2xl shadow-md p-6 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 cursor-pointer relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-100 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center space-x-4">
              <div className="p-3 bg-indigo-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <FaShoppingCart className="text-indigo-600 text-2xl" />
              </div>
              <div>
                <h3 className="text-sm text-gray-500">Total Orders</h3>
                <p className="text-3xl font-bold text-gray-800">{total}</p>
              </div>
            </div>
          </div>

          <div className="group bg-white rounded-2xl shadow-md p-6 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 cursor-pointer relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-100 to-yellow-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center space-x-4">
              <div className="p-3 bg-yellow-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <FaClock className="text-yellow-600 text-2xl" />
              </div>
              <div>
                <h3 className="text-sm text-gray-500">Pending</h3>
                <p className="text-3xl font-bold text-gray-800">{pending}</p>
              </div>
            </div>
          </div>

          <div className="group bg-white rounded-2xl shadow-md p-6 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 cursor-pointer relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-green-100 to-green-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-xl group-hover:scale-110 transition-transform duration-300">
                <FaCheckCircle className="text-green-600 text-2xl" />
              </div>
              <div>
                <h3 className="text-sm text-gray-500">Delivered</h3>
                <p className="text-3xl font-bold text-gray-800">{delivered}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-700">Recent Orders</h2>
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-gray-600">
              <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3">Order ID</th>
                  <th className="px-6 py-3">Grade</th>
                  <th className="px-6 py-3">Quantity</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Credit</th>
                  <th className="px-6 py-3">Quality</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrders.map((order) => {
                  const displayStatus = getDashboardStatus(order);
                  const quality = qualityRows.find((row) => row.orderId === order.orderId);
                  const qualityLabel = !quality
                    ? "PENDING"
                    : quality.qualityCertificateGenerated
                    ? "CERTIFIED"
                    : quality.cube28DayWithinStandard && quality.slumpWithinStandard
                    ? "PASS"
                    : "DEVIATION";
                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">{order.orderId}</td>
                      <td className="px-6 py-4">{order.grade}</td>
                      <td className="px-6 py-4">{order.quantity} m3</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            displayStatus === "DELIVERED"
                              ? "bg-green-100 text-green-600"
                              : displayStatus === "PENDING_APPROVAL"
                              ? "bg-yellow-100 text-yellow-600"
                              : displayStatus === "IN_TRANSIT" || displayStatus === "DISPATCHED"
                              ? "bg-blue-100 text-blue-600"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {displayStatus.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {String(order.paymentOption || "").toUpperCase() === "PAY_LATER"
                          ? `${(order.creditApprovalStatus || "PENDING").replaceAll("_", " ")}${order.creditDays ? ` (${order.creditDays} days)` : ""}`
                          : "-"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            qualityLabel === "CERTIFIED"
                              ? "bg-emerald-100 text-emerald-700"
                              : qualityLabel === "PASS"
                              ? "bg-green-100 text-green-700"
                              : qualityLabel === "DEVIATION"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {qualityLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-6 text-center text-gray-500">
                      No orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-xs text-cyan-900">
            Quality status meaning: <span className="font-semibold">PENDING</span> = QC test not entered,
            <span className="font-semibold"> PASS</span> = test values are okay,
            <span className="font-semibold"> DEVIATION</span> = some value is out of range,
            <span className="font-semibold"> CERTIFIED</span> = quality certificate generated by admin.
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
