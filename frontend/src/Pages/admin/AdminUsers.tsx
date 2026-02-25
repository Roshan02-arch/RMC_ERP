import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface User {
  id: number;
  name: string;
  email: string;
  number: string;
  role: string;
}

const AdminUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);

  // 🔐 Protect Route
  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "ADMIN") {
      navigate("/login");
    }
  }, [navigate]);

  // 📦 Fetch Users
  const fetchUsers = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/admin/users");
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

 return (
   <div className="min-h-screen bg-gradient-to-br from-slate-100 to-gray-200 flex">

     {/* Sidebar */}
     <aside className="w-64 bg-slate-900 text-white flex flex-col p-6 shadow-2xl">
       <h2 className="text-2xl font-bold text-indigo-400 mb-10">
         Admin Panel
       </h2>

       <nav className="flex flex-col gap-4 text-sm font-medium">
         <button
           onClick={() => navigate("/admin")}
           className="text-left px-4 py-2 rounded-lg hover:bg-slate-800 transition"
         >
           Dashboard
         </button>

         <button
           onClick={() => navigate("/admin/orders")}
           className="text-left px-4 py-2 rounded-lg hover:bg-slate-800 transition"
         >
           Orders
         </button>

         <button
           onClick={() => navigate("/admin/users")}
           className="text-left px-4 py-2 rounded-lg bg-slate-800"
         >
           Users
         </button>

         <button
           onClick={() => {
             localStorage.clear();
             navigate("/login");
           }}
           className="text-left px-4 py-2 rounded-lg text-red-400 hover:bg-slate-800 hover:text-red-300 transition"
         >
           Logout
         </button>
       </nav>
     </aside>

     {/* Main Content */}
     <main className="flex-1 p-10">

       <div className="flex justify-between items-center mb-8">
         <h2 className="text-3xl font-bold text-gray-800">
           All Users
         </h2>

         {/* Search Input (UI only for now) */}
         <input
           type="text"
           placeholder="Search users..."
           className="px-4 py-2 border border-gray-300 rounded-lg text-sm
                      focus:ring-2 focus:ring-indigo-500/30
                      focus:border-indigo-500 outline-none transition"
         />
       </div>

       <div className="bg-white rounded-2xl shadow-2xl p-8">

         <div className="overflow-x-auto">
           <table className="min-w-full text-sm">

             <thead className="sticky top-0 bg-gray-50">
               <tr className="text-gray-600 uppercase text-xs tracking-wider">
                 <th className="px-6 py-4 text-left">Name</th>
                 <th className="px-6 py-4 text-left">Email</th>
                 <th className="px-6 py-4 text-left">Mobile</th>
                 <th className="px-6 py-4 text-left">Role</th>
               </tr>
             </thead>

             <tbody className="divide-y divide-gray-200">
               {users.map((user) => (
                 <tr
                   key={user.id}
                   className="hover:bg-indigo-50 transition duration-200"
                 >
                   <td className="px-6 py-4 font-medium text-gray-800">
                     {user.name}
                   </td>

                   <td className="px-6 py-4 text-gray-600">
                     {user.email}
                   </td>

                   <td className="px-6 py-4">
                     {user.number}
                   </td>

                   <td className="px-6 py-4">
                     <span
                       className={`px-4 py-1 rounded-full text-xs font-semibold ${
                         user.role === "ADMIN"
                           ? "bg-indigo-100 text-indigo-700"
                           : "bg-gray-100 text-gray-700"
                       }`}
                     >
                       {user.role}
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

export default AdminUsers;