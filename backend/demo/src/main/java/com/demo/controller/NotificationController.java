package com.demo.controller;

import com.demo.entity.CustomerNotification;
import com.demo.entity.Order;
import com.demo.entity.PaymentRecord;
import com.demo.entity.User;
import com.demo.repository.CustomerNotificationRepository;
import com.demo.repository.OrderRepository;
import com.demo.repository.PaymentRecordRepository;
import com.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin("*")
public class NotificationController {

    @Autowired
    private CustomerNotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private PaymentRecordRepository paymentRecordRepository;

    @GetMapping("/{userId}")
    public ResponseEntity<?> getCustomerNotifications(@PathVariable Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }

        generateDueReminders(user);

        List<Map<String, Object>> rows = notificationRepository
                .findByUser_IdAndDeletedFalseOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toView)
                .toList();

        return ResponseEntity.ok(rows);
    }

    @PutMapping("/{notificationId}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long notificationId, @RequestParam Long userId) {
        CustomerNotification notification = notificationRepository.findByIdAndUser_Id(notificationId, userId).orElse(null);
        if (notification == null) {
            return ResponseEntity.status(404).body(Map.of("message", "Notification not found"));
        }
        notification.setRead(true);
        notificationRepository.save(notification);
        return ResponseEntity.ok(Map.of("message", "Notification marked as read"));
    }

    @DeleteMapping("/{notificationId}")
    public ResponseEntity<?> deleteNotification(@PathVariable Long notificationId, @RequestParam Long userId) {
        CustomerNotification notification = notificationRepository.findByIdAndUser_Id(notificationId, userId).orElse(null);
        if (notification == null) {
            return ResponseEntity.status(404).body(Map.of("message", "Notification not found"));
        }
        notification.setDeleted(true);
        notificationRepository.save(notification);
        return ResponseEntity.ok(Map.of("message", "Notification deleted"));
    }

    private void generateDueReminders(User user) {
        LocalDate today = LocalDate.now();
        List<Order> orders = orderRepository.findByUserId(user.getId());

        for (Order order : orders) {
            if (!"PAY_LATER".equalsIgnoreCase(order.getPaymentOption())
                    || !"APPROVED".equalsIgnoreCase(order.getCreditApprovalStatus())
                    || order.getCreditDueDate() == null) {
                continue;
            }

            LocalDate reviewDate = order.getCreditReviewedAt() != null
                    ? order.getCreditReviewedAt().toLocalDate()
                    : order.getApprovedAt() != null
                    ? order.getApprovedAt().toLocalDate()
                    : today;

            long daysSinceApproval = ChronoUnit.DAYS.between(reviewDate, today);
            if (daysSinceApproval < 2 || daysSinceApproval % 2 != 0) {
                continue;
            }
            if (today.isAfter(order.getCreditDueDate().toLocalDate())) {
                continue;
            }
            if (isPaymentCompleted(order)) {
                continue;
            }

            String reminderKey = order.getOrderId() + "-credit-reminder-" + today;
            if (notificationRepository.existsByUser_IdAndReminderKey(user.getId(), reminderKey)) {
                continue;
            }

            CustomerNotification notification = new CustomerNotification();
            notification.setUser(user);
            notification.setOrderId(order.getOrderId());
            notification.setTitle("Credit due reminder");
            notification.setMessage("Pay later order " + order.getOrderId() + " is approved. Due date is " + order.getCreditDueDate() + ". Please complete payment before due date.");
            notification.setType("CREDIT_REMINDER");
            notification.setCreatedAt(LocalDateTime.now());
            notification.setRead(false);
            notification.setDeleted(false);
            notification.setReminderKey(reminderKey);
            notificationRepository.save(notification);
        }
    }

    private boolean isPaymentCompleted(Order order) {
        List<PaymentRecord> records = paymentRecordRepository.findByOrder_Id(order.getId());
        double totalPaid = records.stream()
                .filter(record -> record.getMethod() == null
                        || !record.getMethod().trim().toUpperCase().startsWith("CASH_ON_DELIVERY"))
                .mapToDouble(PaymentRecord::getAmount)
                .sum();
        double totalPayable = order.getTotalPrice() + ((order.getTotalPrice() * 18.0) / 100.0);
        return totalPaid >= totalPayable || totalPaid >= order.getTotalPrice();
    }

    private Map<String, Object> toView(CustomerNotification notification) {
        Map<String, Object> row = new HashMap<>();
        row.put("id", notification.getId());
        row.put("orderId", notification.getOrderId());
        row.put("title", notification.getTitle());
        row.put("message", notification.getMessage());
        row.put("type", notification.getType());
        row.put("createdAt", notification.getCreatedAt());
        row.put("read", notification.isRead());
        return row;
    }
}
