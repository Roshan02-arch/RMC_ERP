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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@Service
public class OrderNotificationService {

    @Autowired
    private OrderNotificationRepository orderNotificationRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private PayLaterEmailService payLaterEmailService;

    /**
     * Runs daily at 09:00.
     * - Every 2 days for PAY_LATER orders where payment is still pending.
     * - Daily once the credit due date is reached.
     * Stops automatically when paymentReceivedAt is set (payment completed).
     */
    @Scheduled(cron = "0 0 9 * * *")
    @Transactional
    public void sendPayLaterReminders() {
        LocalDateTime now = LocalDateTime.now();

        for (Order order : orderRepository.findAll()) {
            if (order == null || order.getUser() == null || order.getUser().getId() == null) {
                continue;
            }

            // Only PAY_LATER orders
            boolean isPayLater = "PAY_LATER".equalsIgnoreCase(String.valueOf(order.getPaymentOption()))
                    || "PAY_LATER".equalsIgnoreCase(String.valueOf(order.getPaymentType()));
            if (!isPayLater) {
                continue;
            }

            // Stop if payment already received
            if (order.getPaymentReceivedAt() != null) {
                continue;
            }
            if ("PAID".equalsIgnoreCase(order.getPaymentStatus())) {
                continue;
            }

            // Stop if workflow completed
            String workflow = normalize(order.getOrderWorkflowStatus());
            if ("completed".equals(workflow) || "payment_received".equals(workflow)) {
                continue;
            }

            LocalDateTime dueDateTime = order.getCreditDueDate();
            boolean isDueDateReached = (dueDateTime != null && !now.isBefore(dueDateTime));

            // Interval: 1 day when due, 2 days otherwise
            int intervalDays = isDueDateReached ? 1 : 2;

            // Update reminderIntervalDays on the entity if it changed
            if (!Integer.valueOf(intervalDays).equals(order.getReminderIntervalDays())) {
                order.setReminderIntervalDays(intervalDays);
                orderRepository.save(order);
            }

            // Check last reminder time (use lastReminderSentAt if available, else query notification table)
            LocalDateTime lastSent = order.getLastReminderSentAt();
            if (lastSent == null) {
                OrderNotification lastNotif = orderNotificationRepository
                        .findTopByUserIdAndOrderIdAndTypeOrderByCreatedAtDesc(
                                order.getUser().getId(),
                                order.getOrderId() == null ? "" : order.getOrderId(),
                                NotificationType.PAY_LATER_REMINDER
                        )
                        .orElse(null);
                lastSent = lastNotif != null ? lastNotif.getCreatedAt() : null;
            }

            if (lastSent != null && lastSent.isAfter(now.minusDays(intervalDays))) {
                continue;
            }

            // Build message
            String orderId = order.getOrderId() == null ? "" : order.getOrderId();
            String dueDateStr = dueDateTime == null ? "" : " Due date: " + dueDateTime.toLocalDate();
            String reminderMessage;
            if (isDueDateReached) {
                reminderMessage = "\u26a0\ufe0f Payment due today for order " + orderId
                        + "! Please complete your payment immediately." + dueDateStr;
            } else {
                reminderMessage = "Reminder: Payment is pending for order " + orderId + "." + dueDateStr;
            }

            // Send in-app notification
            createNotification(order, NotificationType.PAY_LATER_REMINDER, reminderMessage);

            // Send email notification
            payLaterEmailService.sendPayLaterReminder(order, isDueDateReached);

            // Persist last reminder sent time
            order.setLastReminderSentAt(now);
            orderRepository.save(order);
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

    public void createNotificationForUser(Long userId, String referenceId, NotificationType type, String message) {
        if (userId == null || userId <= 0 || type == null) {
            return;
        }

        NotificationType persistedType = toPersistedType(type);
        String orderId = referenceId == null ? "" : referenceId.trim();
        String title = getTitle(type);
        String body = isBlank(message) ? getDefaultMessage(type) : message.trim();

        OrderNotification latestOfSameType = orderNotificationRepository
                .findTopByUserIdAndOrderIdAndTypeOrderByCreatedAtDesc(userId, orderId, persistedType)
                .orElse(null);

        if (latestOfSameType != null
                && Objects.equals(normalize(latestOfSameType.getMessage()), normalize(body))
                && latestOfSameType.getCreatedAt() != null
                && latestOfSameType.getCreatedAt().isAfter(LocalDateTime.now().minusMinutes(2))) {
            return;
        }

        OrderNotification notification = new OrderNotification();
        notification.setUserId(userId);
        notification.setOrderId(orderId);
        notification.setTitle(title);
        notification.setMessage(body);
        notification.setType(persistedType);
        notification.setRead(false);
        notification.setCreatedAt(LocalDateTime.now());
        orderNotificationRepository.save(notification);
    }

    private NotificationType toPersistedType(NotificationType type) {
        return switch (type) {
            case PAY_LATER_REQUESTED,
                 CREDIT_REJECTED,
                 NEW_QUOTATION_REQUEST,
                 QUOTATION_REQUEST_SENT,
                 QUOTATION_SENT,
                 QUOTATION_RESPONSE_REJECTED -> NotificationType.DELIVERY_STATUS_UPDATED;
            case CREDIT_APPROVED,
                 QUOTATION_REQUEST_APPROVED,
                 QUOTATION_RESPONSE_ACCEPTED -> NotificationType.ORDER_APPROVED;
            default -> type;
        };
    }

    public List<OrderNotification> getNotificationsByUser(Long userId) {
        List<OrderNotification> allRows = orderNotificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return keepLatestNotifications(allRows);
    }

    public long getUnreadCount(Long userId) {
        return getNotificationsByUser(userId)
                .stream()
                .filter(row -> !row.isRead())
                .count();
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

    @Transactional
    public boolean deleteNotification(Long userId, Long notificationId) {
        OrderNotification notification = orderNotificationRepository
                .findByIdAndUserId(notificationId, userId)
                .orElse(null);

        if (notification == null) {
            return false;
        }

        orderNotificationRepository.delete(notification);
        return true;
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
            case NEW_QUOTATION_REQUEST -> "New Quotation Request";
            case QUOTATION_REQUEST_SENT -> "Quotation Request Sent";
            case QUOTATION_REQUEST_APPROVED -> "Quotation Request Approved";
            case QUOTATION_SENT -> "Quotation Sent";
            case QUOTATION_RESPONSE_ACCEPTED -> "Quotation Accepted";
            case QUOTATION_RESPONSE_REJECTED -> "Quotation Rejected";
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
            case NEW_QUOTATION_REQUEST -> "A new quotation request has been received.";
            case QUOTATION_REQUEST_SENT -> "Quotation request sent successfully.";
            case QUOTATION_REQUEST_APPROVED -> "Your quotation request has been approved.";
            case QUOTATION_SENT -> "New quotation has been sent to you.";
            case QUOTATION_RESPONSE_ACCEPTED -> "Customer accepted the quotation.";
            case QUOTATION_RESPONSE_REJECTED -> "Quotation was rejected.";
            case ORDER_APPROVED -> "Your order has been approved.";
            case IN_PRODUCTION -> "Your order is now in production.";
            case DISPATCH_SCHEDULED -> "Your dispatch has been scheduled.";
            case VEHICLE_ASSIGNED -> "Vehicle and driver have been assigned to your order.";
            case DELIVERY_STATUS_UPDATED -> "Your delivery status has been updated.";
            case ORDER_DELIVERED -> "Your order has been delivered successfully.";
            case ORDER_RETURNED -> "Your order has been marked as returned.";
        };
    }

    private List<OrderNotification> keepLatestNotifications(List<OrderNotification> rows) {
        if (rows == null || rows.isEmpty()) {
            return List.of();
        }

        Map<String, OrderNotification> latestByKey = new LinkedHashMap<>();
        for (OrderNotification row : rows) {
            if (row == null) {
                continue;
            }

            String key = buildLatestKey(row);
            if (!latestByKey.containsKey(key)) {
                latestByKey.put(key, row);
            }
        }

        return latestByKey.values().stream().toList();
    }

    private String buildLatestKey(OrderNotification row) {
        String orderId = row.getOrderId() == null ? "" : row.getOrderId().trim();
        String type = row.getType() == null ? "UNKNOWN" : row.getType().name();
        return orderId + "|" + type;
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
