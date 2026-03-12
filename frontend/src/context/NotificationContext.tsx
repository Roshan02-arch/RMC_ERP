import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { normalizeRole } from "../utils/auth";
import type { AppNotification, NotificationType, ToastVariant } from "../types/notification";

type ToastItem = {
  id: number;
  title: string;
  message: string;
  orderId: string;
  variant: ToastVariant;
};

type NotificationContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  isPanelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

const POLL_INTERVAL_MS = 15000;
const TOAST_AUTO_CLOSE_MS = 4500;

const toToastVariant = (type: NotificationType): ToastVariant => {
  if (type === "ORDER_APPROVED" || type === "ORDER_DELIVERED") {
    return "success";
  }
  if (type === "ORDER_RETURNED") {
    return "warning";
  }
  return "info";
};

const toastClassByVariant: Record<ToastVariant, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  info: "border-sky-200 bg-sky-50 text-sky-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
};

const mapNotification = (row: Partial<AppNotification>): AppNotification => ({
  id: Number(row.id || 0),
  userId: Number(row.userId || 0),
  orderId: String(row.orderId || ""),
  title: String(row.title || ""),
  message: String(row.message || ""),
  type: String(row.type || "DELIVERY_STATUS_UPDATED") as NotificationType,
  isRead: Boolean(row.isRead),
  createdAt: row.createdAt,
});

const parseSeenIds = (raw: string | null): Set<number> => {
  if (!raw) {
    return new Set<number>();
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set<number>();
    }
    const ids = parsed
      .map((item) => Number(item))
      .filter((id) => Number.isFinite(id) && id > 0);
    return new Set<number>(ids);
  } catch {
    return new Set<number>();
  }
};

const saveSeenIds = (userId: string, seenIds: Set<number>) => {
  const key = `notification_toast_seen_${userId}`;
  const trimmed = Array.from(seenIds).slice(-300);
  sessionStorage.setItem(key, JSON.stringify(trimmed));
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const timeoutRef = useRef<Record<number, number>>({});

  const role = normalizeRole(localStorage.getItem("role"));
  const userId = localStorage.getItem("userId") || "";
  const isCustomerSession = role === "CUSTOMER" && userId !== "";

  const closeToast = useCallback((toastId: number) => {
    if (timeoutRef.current[toastId]) {
      window.clearTimeout(timeoutRef.current[toastId]);
      delete timeoutRef.current[toastId];
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
  }, []);

  const enqueueToast = useCallback((notification: AppNotification) => {
    const toastId = Date.now() + Math.floor(Math.random() * 100000);
    const toast: ToastItem = {
      id: toastId,
      title: notification.title,
      message: notification.message,
      orderId: notification.orderId,
      variant: toToastVariant(notification.type),
    };

    setToasts((prev) => [toast, ...prev].slice(0, 5));
    timeoutRef.current[toastId] = window.setTimeout(() => {
      closeToast(toastId);
    }, TOAST_AUTO_CLOSE_MS);
  }, [closeToast]);

  const fetchNotifications = useCallback(async () => {
    if (!isCustomerSession) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8080/api/notifications/my/${userId}?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await res.json();
      const rows = Array.isArray(data) ? data.map(mapNotification).filter((row) => row.id > 0) : [];

      setNotifications(rows);
      setUnreadCount(rows.filter((row) => !row.isRead).length);

      const seenKey = `notification_toast_seen_${userId}`;
      const seenIds = parseSeenIds(sessionStorage.getItem(seenKey));
      const unreadUnseen = rows.filter((row) => !row.isRead && !seenIds.has(row.id));

      unreadUnseen
        .slice(0, 3)
        .reverse()
        .forEach((row) => {
          enqueueToast(row);
          seenIds.add(row.id);
        });

      saveSeenIds(userId, seenIds);
    } catch (error) {
      console.error("Failed to load notifications", error);
    } finally {
      setLoading(false);
    }
  }, [enqueueToast, isCustomerSession, userId]);

  useEffect(() => {
    if (!isCustomerSession) {
      return;
    }

    void fetchNotifications();
    const intervalId = window.setInterval(() => {
      void fetchNotifications();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchNotifications, isCustomerSession]);

  useEffect(() => {
    return () => {
      Object.values(timeoutRef.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      timeoutRef.current = {};
    };
  }, []);

  const markAsRead = useCallback(async (notificationId: number) => {
    if (!isCustomerSession) {
      return;
    }

    const res = await fetch(
      `http://localhost:8080/api/notifications/${notificationId}/read?userId=${encodeURIComponent(userId)}`,
      {
        method: "PUT",
      }
    );

    if (!res.ok) {
      throw new Error("Failed to mark notification as read");
    }

    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === notificationId ? { ...notification, isRead: true } : notification
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, [isCustomerSession, userId]);

  const markAllAsRead = useCallback(async () => {
    if (!isCustomerSession) {
      return;
    }

    const res = await fetch(`http://localhost:8080/api/notifications/my/${userId}/read-all`, {
      method: "PUT",
    });

    if (!res.ok) {
      throw new Error("Failed to mark notifications as read");
    }

    setNotifications((prev) => prev.map((notification) => ({ ...notification, isRead: true })));
    setUnreadCount(0);
  }, [isCustomerSession, userId]);

  const contextValue = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      loading,
      isPanelOpen,
      setPanelOpen: setIsPanelOpen,
      refreshNotifications: fetchNotifications,
      markAsRead,
      markAllAsRead,
    }),
    [fetchNotifications, isPanelOpen, loading, markAllAsRead, markAsRead, notifications, unreadCount]
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}

      <div className="fixed top-20 right-4 z-[70] space-y-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`w-[320px] rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm ${toastClassByVariant[toast.variant]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{toast.title}</p>
                <p className="mt-1 text-sm">{toast.message}</p>
                {toast.orderId && (
                  <p className="mt-1 text-xs font-medium opacity-90">{toast.orderId}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => closeToast(toast.id)}
                className="text-xs font-semibold opacity-75 hover:opacity-100"
              >
                Close
              </button>
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used inside NotificationProvider");
  }
  return context;
};
