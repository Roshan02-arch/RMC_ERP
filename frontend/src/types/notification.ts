export type NotificationType =
  | "ORDER_APPROVED"
  | "IN_PRODUCTION"
  | "DISPATCH_SCHEDULED"
  | "VEHICLE_ASSIGNED"
  | "DELIVERY_STATUS_UPDATED"
  | "ORDER_DELIVERED"
  | "ORDER_RETURNED";

export type ToastVariant = "success" | "info" | "warning";

export type AppNotification = {
  id: number;
  userId: number;
  orderId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt?: string;
};
