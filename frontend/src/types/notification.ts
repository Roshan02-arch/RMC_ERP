export type NotificationType =
  | "NEW_QUOTATION_REQUEST"
  | "QUOTATION_REQUEST_SENT"
  | "QUOTATION_REQUEST_APPROVED"
  | "QUOTATION_SENT"
  | "QUOTATION_RESPONSE_ACCEPTED"
  | "QUOTATION_RESPONSE_REJECTED"
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
