package com.demo.service;

import com.demo.entity.DeliveryTrackingStatus;
import com.demo.entity.NotificationType;
import com.demo.entity.Order;
import com.demo.entity.OrderNotification;
import com.demo.entity.OrderStatus;
import com.demo.repository.OrderNotificationRepository;
import com.demo.repository.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Service
public class OrderNotificationService {

    @Autowired
    private OrderNotificationRepository orderNotificationRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Scheduled(cron = "0 0 10 * * *")
    @Transactional
    public void sendPayLaterReminders() {
        LocalDateTime now = LocalDateTime.now();
        for (Order order : orderRepository.findAll()) {
            if (order == null || order.getUser() == null || order.getUser().getId() == null) {
                continue;
            }

            boolean isPayLater = "PAY_LATER".equalsIgnoreCase(String.valueOf(order.getPaymentOption()))
                    || "PAY_LATER".equalsIgnoreCase(String.valueOf(order.getPaymentType()));
            if (!isPayLater) {
                continue;
            }

            if (order.getPaymentReceivedAt() != null) {
                continue;
            }

            if ("COMPLETED".equalsIgnoreCase(String.valueOf(order.getOrderWorkflowStatus()))
                    || "PAYMENT_RECEIVED".equalsIgnoreCase(String.valueOf(order.getOrderWorkflowStatus()))) {
                continue;
            }

            String creditApproval = normalize(order.getCreditApprovalStatus());
            String creditStatus = normalize(order.getCreditStatus());
            if (!("approved".equals(creditApproval) || "approved".equals(creditStatus))) {
                continue;
            }

            String workflow = normalize(order.getOrderWorkflowStatus());
            if ("completed".equals(workflow)) {
                continue;
            }

            LocalDateTime referenceTime = order.getCreditRequestedAt() != null
                    ? order.getCreditRequestedAt()
                    : order.getCreatedAt();

            if (referenceTime == null || now.isBefore(referenceTime.plusDays(2))) {
                continue;
            }

            OrderNotification latestReminder = orderNotificationRepository
                    .findTopByUserIdAndOrderIdAndTypeOrderByCreatedAtDesc(
                            order.getUser().getId(),
                            order.getOrderId() == null ? "" : order.getOrderId(),
                            NotificationType.PAY_LATER_REMINDER
                    )
                    .orElse(null);

            if (latestReminder != null
                    && latestReminder.getCreatedAt() != null
                    && latestReminder.getCreatedAt().isAfter(now.minusDays(2))) {
                continue;
            }

            String dueText = order.getCreditDueDate() == null
                    ? ""
                    : " Due date: " + order.getCreditDueDate();

            String reminderMessage = "Pay Later reminder: payment is pending for order "
                    + (order.getOrderId() == null ? "" : order.getOrderId())
                    + "."
                    + dueText;

            createNotification(order, NotificationType.PAY_LATER_REMINDER, reminderMessage);
        }
    }

    public void logOrderUpdate(Order order, DeliveryTrackingStatus trackingStatus, String message) {
        NotificationType type = resolveType(order, trackingStatus, message);
        if (type == null) {
            return;
        }
        createNotification(order, type);
    }

    public void createNotification(Order order, NotificationType type) {
        createNotification(order, type, null);
    }

    public void createNotification(Order order, NotificationType type, String messageOverride) {
        if (order == null || order.getUser() == null || order.getUser().getId() == null || type == null) {
            return;
        }

        NotificationType persistedType = toPersistedType(type);

        String orderId = order.getOrderId() == null ? "" : order.getOrderId().trim();
        Long userId = order.getUser().getId();
        String title = getTitle(type);
        String message = isBlank(messageOverride) ? getDefaultMessage(type) : messageOverride.trim();

        OrderNotification latestOfSameType = orderNotificationRepository
                .findTopByUserIdAndOrderIdAndTypeOrderByCreatedAtDesc(userId, orderId, persistedType)
                .orElse(null);

        if (latestOfSameType != null
                && Objects.equals(normalize(latestOfSameType.getMessage()), normalize(message))
                && latestOfSameType.getCreatedAt() != null
                && latestOfSameType.getCreatedAt().isAfter(LocalDateTime.now().minusMinutes(2))) {
            return;
        }

        OrderNotification notification = new OrderNotification();
        notification.setUserId(userId);
        notification.setOrderId(orderId);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(persistedType);
        notification.setRead(false);
        notification.setCreatedAt(LocalDateTime.now());
        orderNotificationRepository.save(notification);
    }

    private NotificationType toPersistedType(NotificationType type) {
        return switch (type) {
            case PAY_LATER_REQUESTED, CREDIT_REJECTED, PAY_LATER_REMINDER -> NotificationType.DELIVERY_STATUS_UPDATED;
            case CREDIT_APPROVED -> NotificationType.ORDER_APPROVED;
            default -> type;
        };
    }

    public List<OrderNotification> getNotificationsByUser(Long userId) {
        return orderNotificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public long getUnreadCount(Long userId) {
        return orderNotificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public boolean markAsRead(Long userId, Long notificationId) {
        OrderNotification notification = orderNotificationRepository
                .findByIdAndUserId(notificationId, userId)
                .orElse(null);

        if (notification == null) {
            return false;
        }

        if (!notification.isRead()) {
            notification.setRead(true);
            orderNotificationRepository.save(notification);
        }
        return true;
    }

    @Transactional
    public int markAllAsRead(Long userId) {
        List<OrderNotification> unread = orderNotificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
        if (unread.isEmpty()) {
            return 0;
        }

        for (OrderNotification notification : unread) {
            notification.setRead(true);
        }
        orderNotificationRepository.saveAll(unread);
        return unread.size();
    }

    private NotificationType resolveType(Order order, DeliveryTrackingStatus trackingStatus, String message) {
        String normalizedMessage = normalize(message);

        if (normalizedMessage.contains("vehicle") && normalizedMessage.contains("driver")) {
            return NotificationType.VEHICLE_ASSIGNED;
        }

        if (normalizedMessage.contains("pending admin credit approval")) {
            return NotificationType.PAY_LATER_REQUESTED;
        }

        if (normalizedMessage.contains("credit approved")) {
            return NotificationType.CREDIT_APPROVED;
        }

        if (normalizedMessage.contains("credit request rejected")
                || normalizedMessage.contains("rejected credit")) {
            return NotificationType.CREDIT_REJECTED;
        }

        if (normalizedMessage.contains("pay later reminder")) {
            return NotificationType.PAY_LATER_REMINDER;
        }

        if (order == null) {
            return null;
        }

        if (order.getStatus() == OrderStatus.RETURNED || trackingStatus == DeliveryTrackingStatus.RETURNED) {
            return NotificationType.ORDER_RETURNED;
        }

        if (order.getStatus() == OrderStatus.DELIVERED || trackingStatus == DeliveryTrackingStatus.DELIVERED) {
            return NotificationType.ORDER_DELIVERED;
        }

        if (order.getStatus() == OrderStatus.IN_PRODUCTION) {
            return NotificationType.IN_PRODUCTION;
        }

        if (trackingStatus == DeliveryTrackingStatus.SCHEDULED_FOR_DISPATCH) {
            return NotificationType.DISPATCH_SCHEDULED;
        }

        if (order.getStatus() == OrderStatus.APPROVED && trackingStatus == null) {
            return NotificationType.ORDER_APPROVED;
        }

        if (trackingStatus == DeliveryTrackingStatus.DISPATCHED
                || trackingStatus == DeliveryTrackingStatus.IN_TRANSIT
                || trackingStatus == DeliveryTrackingStatus.ON_THE_WAY
                || order.getStatus() == OrderStatus.DISPATCHED) {
            return NotificationType.DELIVERY_STATUS_UPDATED;
        }

        if (normalizedMessage.contains("dispatch") && normalizedMessage.contains("schedule")) {
            return NotificationType.DISPATCH_SCHEDULED;
        }

        if (normalizedMessage.contains("deliver") && normalizedMessage.contains("success")) {
            return NotificationType.ORDER_DELIVERED;
        }

        if (normalizedMessage.contains("return")) {
            return NotificationType.ORDER_RETURNED;
        }

        if (normalizedMessage.contains("production")) {
            return NotificationType.IN_PRODUCTION;
        }

        if (normalizedMessage.contains("approved")) {
            return NotificationType.ORDER_APPROVED;
        }

        if (normalizedMessage.contains("status") || normalizedMessage.contains("transit") || normalizedMessage.contains("dispatch")) {
            return NotificationType.DELIVERY_STATUS_UPDATED;
        }

        return null;
    }

    private String getTitle(NotificationType type) {
        return switch (type) {
            case PAY_LATER_REQUESTED -> "Pay Later Requested";
            case CREDIT_APPROVED -> "Credit Approved";
            case CREDIT_REJECTED -> "Credit Rejected";
            case PAY_LATER_REMINDER -> "Pay Later Reminder";
            case ORDER_APPROVED -> "Order Approved";
            case IN_PRODUCTION -> "In Production";
            case DISPATCH_SCHEDULED -> "Dispatch Scheduled";
            case VEHICLE_ASSIGNED -> "Vehicle Assigned";
            case DELIVERY_STATUS_UPDATED -> "Delivery Status Updated";
            case ORDER_DELIVERED -> "Order Delivered";
            case ORDER_RETURNED -> "Order Returned";
        };
    }

    private String getDefaultMessage(NotificationType type) {
        return switch (type) {
            case PAY_LATER_REQUESTED -> "Your Pay Later request is pending admin credit approval.";
            case CREDIT_APPROVED -> "Credit approved. Please pay before due date.";
            case CREDIT_REJECTED -> "Credit request rejected. Please complete payment to process your order.";
            case PAY_LATER_REMINDER -> "Reminder: Pay Later payment is pending.";
            case ORDER_APPROVED -> "Your order has been approved.";
            case IN_PRODUCTION -> "Your order is now in production.";
            case DISPATCH_SCHEDULED -> "Your dispatch has been scheduled.";
            case VEHICLE_ASSIGNED -> "Vehicle and driver have been assigned to your order.";
            case DELIVERY_STATUS_UPDATED -> "Your delivery status has been updated.";
            case ORDER_DELIVERED -> "Your order has been delivered successfully.";
            case ORDER_RETURNED -> "Your order has been marked as returned.";
        };
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
