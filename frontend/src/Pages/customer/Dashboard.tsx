import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaShoppingCart, FaClock, FaCheckCircle } from "react-icons/fa";
import UserNavbar from "../../components/UserNavbar";

interface Order {
  id: number;
  orderId: string;
  grade: string;
  quantity: number;
  status: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
     const role = localStorage.getItem("role");
     const userId = localStorage.getItem("userId");

     // 🔐 Protect route
     if (role !== "CUSTOMER") {
       navigate("/login");
       return;
     }

     // ❗ If no userId, stop
     if (!userId) {
       console.error("User ID not found");
       return;
     }

     // 📦 Fetch user orders
     fetch(`http://localhost:8080/api/orders/my-orders/${userId}`)
       .then((res) => {
         if (!res.ok) {
           throw new Error("Failed to fetch orders");
         }
         return res.json();
       })
       .then((data) => {
         if (Array.isArray(data)) {
           setOrders(data);
         } else {
           setOrders([]);
         }
       })
       .catch((err) => console.error("Fetch error:", err));

   }, [navigate]);

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const total = orders.length;
  const pending = orders.filter(o => o.status === "PENDING_APPROVAL").length;
  const delivered = orders.filter(o => o.status === "DELIVERED").length;

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <UserNavbar />

      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col p-6 space-y-6 pt-24">
        <h2 className="text-2xl font-bold text-indigo-400">RMC ERP</h2>

        <nav className="flex flex-col space-y-4 text-sm">
          <button className="text-left hover:text-indigo-400 transition">
            Dashboard
          </button>
          <button className="text-left hover:text-indigo-400 transition">
            Orders
          </button>
          <button
            onClick={logout}
            className="text-left text-red-400 hover:text-red-300 transition"
          >
            Logout
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 pt-24">

        <h1 className="text-3xl font-bold text-gray-800 mb-8">
          Welcome Customer 👋
        </h1>

       {/* Animated Stats Cards */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

         {/* Total Orders */}
         <div className="group bg-white rounded-2xl shadow-md p-6
                         hover:shadow-xl hover:-translate-y-2
                         transition-all duration-300 cursor-pointer relative overflow-hidden">

           <div className="absolute inset-0 bg-gradient-to-r from-indigo-100 to-indigo-50
                           opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

           <div className="relative flex items-center space-x-4">
             <div className="p-3 bg-indigo-100 rounded-xl
                             group-hover:scale-110 transition-transform duration-300">
               <FaShoppingCart className="text-indigo-600 text-2xl" />
             </div>

             <div>
               <h3 className="text-sm text-gray-500">Total Orders</h3>
               <p className="text-3xl font-bold text-gray-800">{total}</p>
             </div>
           </div>
         </div>

         {/* Pending */}
         <div className="group bg-white rounded-2xl shadow-md p-6
                         hover:shadow-xl hover:-translate-y-2
                         transition-all duration-300 cursor-pointer relative overflow-hidden">

           <div className="absolute inset-0 bg-gradient-to-r from-yellow-100 to-yellow-50
                           opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

           <div className="relative flex items-center space-x-4">
             <div className="p-3 bg-yellow-100 rounded-xl
                             group-hover:scale-110 transition-transform duration-300">
               <FaClock className="text-yellow-600 text-2xl" />
             </div>

             <div>
               <h3 className="text-sm text-gray-500">Pending</h3>
               <p className="text-3xl font-bold text-gray-800">{pending}</p>
             </div>
           </div>
         </div>

         {/* Delivered */}
         <div className="group bg-white rounded-2xl shadow-md p-6
                         hover:shadow-xl hover:-translate-y-2
                         transition-all duration-300 cursor-pointer relative overflow-hidden">

           <div className="absolute inset-0 bg-gradient-to-r from-green-100 to-green-50
                           opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

           <div className="relative flex items-center space-x-4">
             <div className="p-3 bg-green-100 rounded-xl
                             group-hover:scale-110 transition-transform duration-300">
               <FaCheckCircle className="text-green-600 text-2xl" />
             </div>

             <div>
               <h3 className="text-sm text-gray-500">Delivered</h3>
               <p className="text-3xl font-bold text-gray-800">{delivered}</p>
             </div>
           </div>
         </div>

       </div>
        {/* Orders Table */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            Recent Orders
          </h2>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-gray-600">
              <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3">Order ID</th>
                  <th className="px-6 py-3">Grade</th>
                  <th className="px-6 py-3">Quantity</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">{order.orderId}</td>
                    <td className="px-6 py-4">{order.grade}</td>
                    <td className="px-6 py-4">{order.quantity} m³</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          order.status === "DELIVERED"
                            ? "bg-green-100 text-green-600"
                            : order.status === "PENDING_APPROVAL"
                            ? "bg-yellow-100 text-yellow-600"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        </div>

      </main>
    </div>
  );
};

export default Dashboard;
