import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Logout = () => {
  const navigate = useNavigate();

  useEffect(() => {
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
    navigate("/login", { replace: true });
  }, [navigate]);

  return null;
};

export default Logout;
