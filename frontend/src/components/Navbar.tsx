import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FaBell } from "react-icons/fa";
import { normalizeRole } from "../utils/auth";
import { useNotifications } from "../context/NotificationContext";
import type { AppNotification } from "../types/notification";

type UserProfile = {
  id: number;
  name: string;
  email: string;
  number: string;
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

const typeBadgeClass = (type: string) => {
  if (type === "PAY_LATER_REQUESTED") {
    return "bg-amber-100 text-amber-700";
  }
  if (type === "CREDIT_APPROVED") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (type === "CREDIT_REJECTED") {
    return "bg-rose-100 text-rose-700";
  }
  if (type === "PAY_LATER_REMINDER") {
    return "bg-violet-100 text-violet-700";
  }
  if (type === "ORDER_DELIVERED" || type === "ORDER_APPROVED") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (type === "ORDER_RETURNED") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-sky-100 text-sky-700";
};

const Navbar = () => {
  const navigate = useNavigate();
  const role = normalizeRole(localStorage.getItem("role"));
  const userId = localStorage.getItem("userId");
  const rawUsername = localStorage.getItem("username");
  const rawEmail = localStorage.getItem("userEmail");
  const rawNumber = localStorage.getItem("userNumber");

  const {
    notifications,
    unreadCount,
    loading,
    isPanelOpen,
    setPanelOpen,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const rootRef = useRef<HTMLDivElement | null>(null);

  const username =
    rawUsername &&
    rawUsername.trim() !== "" &&
    rawUsername !== "undefined" &&
    rawUsername !== "null"
      ? rawUsername
      : null;

  const [showProfile, setShowProfile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [displayName, setDisplayName] = useState(username || "");
  const [profile, setProfile] = useState<UserProfile | null>({
    id: Number(userId || 0),
    name: displayName,
    email: rawEmail || "",
    number: rawNumber || "",
  });
  const [loadingProfile, setLoadingProfile] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      setLoadingProfile(true);
      let res = await fetch(`http://localhost:8080/api/users/${userId}/profile`);
      if (!res.ok) {
        res = await fetch(`http://localhost:8080/api/users/${userId}`);
      }
      if (!res.ok) {
        throw new Error("Failed to load profile");
      }

      const data = await res.json();
      setProfile(data);
      localStorage.setItem("username", data.name || "");
      localStorage.setItem("userEmail", data.email || "");
      localStorage.setItem("userNumber", data.number || "");
      setDisplayName(data.name || "");
    } catch {
      // Keep local fallback profile when API fails.
    } finally {
      setLoadingProfile(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!showProfile) {
      return;
    }
    void fetchProfile();
  }, [showProfile, fetchProfile]);

  useEffect(() => {
    const syncFromStorage = () => {
      const nextName = localStorage.getItem("username") || "";
      const nextEmail = localStorage.getItem("userEmail") || "";
      const nextNumber = localStorage.getItem("userNumber") || "";

      setDisplayName(nextName);
      setProfile((prev) => ({
        id: prev?.id || Number(userId || 0),
        name: nextName,
        email: nextEmail,
        number: nextNumber,
      }));
    };

    window.addEventListener("profile-updated", syncFromStorage);
    window.addEventListener("storage", syncFromStorage);
    return () => {
      window.removeEventListener("profile-updated", syncFromStorage);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, [userId]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current) {
        return;
      }
      const target = event.target as Node;
      if (!rootRef.current.contains(target)) {
        setShowMenu(false);
        setShowProfile(false);
        setPanelOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [setPanelOpen]);

  if (role !== "CUSTOMER") {
    return null;
  }

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "text-indigo-600 font-semibold border-b-2 border-indigo-600 pb-1"
      : "hover:text-indigo-600 transition";

  const menuItemClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "block px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50"
      : "block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition";

  const onNotificationClick = async (notification: AppNotification) => {
    try {
      if (!notification.isRead) {
        await markAsRead(notification.id);
      }
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    } finally {
      setPanelOpen(false);
      if (notification.orderId) {
        navigate("/delivery-tracking", { state: { selectedOrderId: notification.orderId } });
      } else {
        navigate("/notifications");
      }
    }
  };

  const topNotifications = notifications.slice(0, 12);

  return (
    <div ref={rootRef} className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-sm font-medium text-gray-700">
        <NavLink to="/home" className="text-2xl font-bold text-indigo-500 hover:text-indigo-400 transition">
          RMC ERP
        </NavLink>
        <div className="flex items-center gap-6">
          <NavLink to="/home" className={navItemClass}>
            Home
          </NavLink>
          <NavLink to="/purchaseproduct" className={navItemClass}>
            Purchase Product
          </NavLink>
          {displayName && <span className="text-indigo-600">Welcome, {displayName}</span>}

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowMenu(false);
                setShowProfile(false);
                setPanelOpen(!isPanelOpen);
              }}
              className="relative h-9 w-9 rounded-full border border-gray-200 flex items-center justify-center hover:border-indigo-300 hover:text-indigo-600 transition"
              title="Notifications"
              aria-label="Open notifications"
            >
              <FaBell className="text-base" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {isPanelOpen && (
              <div className="absolute right-0 mt-3 w-[360px] max-w-[90vw] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Notifications</p>
                    <p className="text-xs text-gray-500">Unread: {unreadCount}</p>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await markAllAsRead();
                        } catch (error) {
                          console.error("Failed to mark all notifications as read", error);
                        }
                      }}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {loading && notifications.length === 0 ? (
                    <p className="px-4 py-4 text-sm text-gray-500">Loading notifications...</p>
                  ) : topNotifications.length === 0 ? (
                    <p className="px-4 py-4 text-sm text-gray-500">No notifications yet.</p>
                  ) : (
                    topNotifications.map((notification) => (
                      <button
                        type="button"
                        key={notification.id}
                        onClick={() => void onNotificationClick(notification)}
                        className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition ${
                          notification.isRead ? "bg-white" : "bg-indigo-50/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{notification.title || "Update"}</p>
                            <p className="text-sm text-gray-700 mt-1">{notification.message}</p>
                          </div>
                          {!notification.isRead && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-indigo-500" />}
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${typeBadgeClass(notification.type)}`}>
                            {notification.type.replaceAll("_", " ")}
                          </span>
                          <p className="text-[11px] text-gray-500">{formatTimestamp(notification.createdAt)}</p>
                        </div>
                        {notification.orderId && (
                          <p className="mt-1 text-xs text-gray-500 font-medium">{notification.orderId}</p>
                        )}
                      </button>
                    ))
                  )}
                </div>

                <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setPanelOpen(false);
                      navigate("/notifications");
                    }}
                    className="text-sm font-medium text-indigo-700 hover:text-indigo-600"
                  >
                    View all
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setPanelOpen(false);
              setShowMenu(false);
              setShowProfile((prev) => !prev);
            }}
            className="hover:text-indigo-600 transition text-lg"
            title="Profile"
          >
            &#128100;
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setPanelOpen(false);
                setShowProfile(false);
                setShowMenu((prev) => !prev);
              }}
              className="text-xl leading-none hover:text-indigo-600 transition"
              title="Menu"
              aria-label="Open navigation menu"
            >
              &#9776;
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-3 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-2">
                <NavLink
                  to="/dashboard"
                  className={menuItemClass}
                  onClick={() => setShowMenu(false)}
                >
                  My Orders
                </NavLink>
                <NavLink
                  to="/delivery-tracking"
                  className={menuItemClass}
                  onClick={() => setShowMenu(false)}
                >
                  Delivery Tracking
                </NavLink>
                <NavLink
                  to="/pay-later-orders"
                  className={menuItemClass}
                  onClick={() => setShowMenu(false)}
                >
                  Pay Later Orders
                </NavLink>
                <NavLink
                  to="/order-approval-status"
                  className={menuItemClass}
                  onClick={() => setShowMenu(false)}
                >
                  Order Approval Status
                </NavLink>
                <NavLink
                  to="/billing-payment"
                  className={menuItemClass}
                  onClick={() => setShowMenu(false)}
                >
                  Billing & Payment
                </NavLink>
                <NavLink
                  to="/quality-access"
                  className={menuItemClass}
                  onClick={() => setShowMenu(false)}
                >
                  Quality Access
                </NavLink>
                <NavLink
                  to="/notifications"
                  className={menuItemClass}
                  onClick={() => setShowMenu(false)}
                >
                  Notifications
                </NavLink>
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    const currentUserId = localStorage.getItem("userId");
                    const deletedNotifications = currentUserId
                      ? localStorage.getItem(`customer_notification_deleted_${currentUserId}`)
                      : null;
                    const shownToasts = currentUserId
                      ? localStorage.getItem(`customer_notification_toast_shown_${currentUserId}`)
                      : null;
                    localStorage.clear();
                    if (currentUserId && deletedNotifications) {
                      localStorage.setItem(`customer_notification_deleted_${currentUserId}`, deletedNotifications);
                    }
                    if (currentUserId && shownToasts) {
                      localStorage.setItem(`customer_notification_toast_shown_${currentUserId}`, shownToasts);
                    }
                    navigate("/login");
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-50 hover:text-red-600 transition"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showProfile && (
        <div className="absolute right-6 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 p-5 text-gray-700">
          <h3 className="text-base font-semibold mb-4">Profile</h3>

          {loadingProfile && (
            <p className="text-sm text-gray-500 mb-3">Loading latest profile...</p>
          )}

          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Full Name</label>
            <input
              type="text"
              value={profile?.name || ""}
              readOnly
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100"
            />
          </div>

          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Email ID</label>
            <input
              type="text"
              value={profile?.email || ""}
              readOnly
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100"
            />
          </div>

          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Number</label>
            <input
              type="text"
              value={profile?.number || ""}
              readOnly
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-100"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowProfile(false)}
              className="px-4 py-2 text-sm rounded-md bg-gray-200 hover:bg-gray-300 transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                setShowProfile(false);
                navigate("/customize-profile");
              }}
              className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-500 transition"
            >
              Update Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Navbar;
