import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface PendingAdmin {
  id: number;
  name: string;
  email: string;
  number: string;
  approvalStatus: string;
}

const AdminLogins = () => {
  const navigate = useNavigate();
  const [pendingAdmins, setPendingAdmins] = useState<PendingAdmin[]>([]);

  const fetchPendingAdmins = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/admin/admin-logins/pending");
      const data = await res.json();
      setPendingAdmins(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching pending admins:", error);
    }
  };

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "ADMIN") {
      navigate("/login");
      return;
    }
    void fetchPendingAdmins();
  }, [navigate]);

  const handleDecision = async (userId: number, action: "approve" | "reject") => {
    try {
      const res = await fetch(
        `http://localhost:8080/api/admin/admin-logins/${userId}/${action}`,
        { method: "PUT" }
      );
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Action failed");
        return;
      }
      void fetchPendingAdmins();
    } catch (error) {
      console.error("Approval action failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-64 bg-slate-900 text-white flex flex-col p-6 shadow-xl">
        <h2 className="text-2xl font-bold text-indigo-400 mb-10">Admin Panel</h2>

        <nav className="flex flex-col gap-4 text-sm font-medium">
          <button
            onClick={() => navigate("/admin")}
            className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition"
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate("/admin/orders")}
            className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition"
          >
            Orders
          </button>
          <button
            onClick={() => navigate("/admin/users")}
            className="text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition"
          >
            Users
          </button>
          <button
            onClick={() => navigate("/admin/adminlogins")}
            className="text-left px-3 py-2 rounded-lg bg-slate-800"
          >
            Admin Logins
          </button>
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

      <main className="flex-1 p-10">
        <h2 className="text-3xl font-bold text-gray-800 mb-8">Pending Admin Logins</h2>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
                  <th className="px-6 py-4 text-left">Name</th>
                  <th className="px-6 py-4 text-left">Email</th>
                  <th className="px-6 py-4 text-left">Mobile</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pendingAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-gray-800">{admin.name}</td>
                    <td className="px-6 py-4">{admin.email}</td>
                    <td className="px-6 py-4">{admin.number}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                        {admin.approvalStatus || "PENDING_APPROVAL"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDecision(admin.id, "approve")}
                          className="px-3 py-1 text-xs font-medium bg-green-600 hover:bg-green-500 text-white rounded-md transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleDecision(admin.id, "reject")}
                          className="px-3 py-1 text-xs font-medium bg-red-600 hover:bg-red-500 text-white rounded-md transition"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pendingAdmins.length === 0 && (
                  <tr>
                    <td className="px-6 py-6 text-center text-gray-500" colSpan={5}>
                      No pending admin approvals
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLogins;
