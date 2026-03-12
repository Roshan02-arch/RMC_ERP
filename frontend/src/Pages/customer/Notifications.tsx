import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { normalizeRole } from "../../utils/auth";
import { useNotifications } from "../../context/NotificationContext";
import type { AppNotification } from "../../types/notification";

const typeClass = (type: string) => {
  if (type === "ORDER_DELIVERED" || type === "ORDER_APPROVED") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (type === "ORDER_RETURNED") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-sky-100 text-sky-700";
};

const formatTimestamp = (value?: string) => {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

const Notifications = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  } = useNotifications();

  useEffect(() => {
    const role = normalizeRole(localStorage.getItem("role"));
    const userId = localStorage.getItem("userId");
    if (role !== "CUSTOMER" || !userId) {
      navigate("/login");
      return;
    }
    void refreshNotifications();
  }, [navigate, refreshNotifications]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return notifications;
    }

    return notifications.filter((row) => {
      return (
        row.orderId.toLowerCase().includes(query) ||
        row.title.toLowerCase().includes(query) ||
        row.message.toLowerCase().includes(query) ||
        row.type.toLowerCase().includes(query)
      );
    });
  }, [notifications, searchTerm]);

  const onRowClick = async (row: AppNotification) => {
    try {
      if (!row.isRead) {
        await markAsRead(row.id);
      }
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }

    if (row.orderId) {
      navigate("/delivery-tracking", { state: { selectedOrderId: row.orderId } });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="max-w-6xl mx-auto px-6 pt-24 pb-10 space-y-6">
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">All customer notifications from backend events.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <p className="text-sm text-gray-600">
              Total: <span className="font-semibold text-gray-800">{notifications.length}</span>
              {" | "}
              Unread: <span className="font-semibold text-indigo-700">{unreadCount}</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <input
                type="text"
                placeholder="Search by order, title or message..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-80 px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <button
                type="button"
                onClick={async () => {
                  try {
                    await markAllAsRead();
                  } catch (error) {
                    console.error("Failed to mark all as read", error);
                  }
                }}
                className="px-3 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition disabled:opacity-60"
                disabled={unreadCount === 0}
              >
                Mark all read
              </button>
            </div>
          </div>

          {loading && notifications.length === 0 ? (
            <p className="text-sm text-gray-500">Loading notifications...</p>
          ) : filteredRows.length === 0 ? (
            <p className="text-sm text-gray-500">No notifications yet.</p>
          ) : (
            <div className="space-y-3">
              {filteredRows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => void onRowClick(row)}
                  className={`w-full text-left border rounded-xl p-4 transition ${
                    row.isRead
                      ? "border-gray-200 bg-white hover:bg-gray-50"
                      : "border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-800">{row.title || "Notification"}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${typeClass(row.type)}`}>
                          {row.type.replaceAll("_", " ")}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            row.isRead ? "bg-gray-100 text-gray-600" : "bg-indigo-100 text-indigo-700"
                          }`}
                        >
                          {row.isRead ? "READ" : "UNREAD"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{row.message}</p>
                      {row.orderId && <p className="text-xs text-gray-500 font-medium">{row.orderId}</p>}
                    </div>
                    <p className="text-xs text-gray-500">{formatTimestamp(row.createdAt)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Notifications;
