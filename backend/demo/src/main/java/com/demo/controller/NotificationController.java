package com.demo.controller;

import com.demo.entity.OrderNotification;
import com.demo.entity.User;
import com.demo.repository.UserRepository;
import com.demo.service.OrderNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin("*")
public class NotificationController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrderNotificationService orderNotificationService;

    @GetMapping("/my/{userId}")
    public ResponseEntity<?> getMyNotifications(@PathVariable Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }

        List<Map<String, Object>> rows = orderNotificationService
                .getNotificationsByUser(userId)
                .stream()
                .map(this::toView)
                .collect(Collectors.toList());

        return ResponseEntity.ok(rows);
    }

    @GetMapping("/my/{userId}/unread-count")
    public ResponseEntity<?> getUnreadCount(@PathVariable Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }

        return ResponseEntity.ok(Map.of("unreadCount", orderNotificationService.getUnreadCount(userId)));
    }

    @PutMapping("/{notificationId}/read")
    public ResponseEntity<?> markAsRead(
            @PathVariable Long notificationId,
            @RequestParam Long userId
    ) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }

        boolean updated = orderNotificationService.markAsRead(userId, notificationId);
        if (!updated) {
            return ResponseEntity.status(404).body(Map.of("message", "Notification not found"));
        }

        return ResponseEntity.ok(Map.of("message", "Notification marked as read"));
    }

    @PutMapping("/my/{userId}/read-all")
    public ResponseEntity<?> markAllAsRead(@PathVariable Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }

        int updatedCount = orderNotificationService.markAllAsRead(userId);
        return ResponseEntity.ok(Map.of(
                "message", "Notifications marked as read",
                "updatedCount", updatedCount
        ));
    }

    private Map<String, Object> toView(OrderNotification n) {
        Map<String, Object> row = new HashMap<>();
        row.put("id", n.getId());
        row.put("userId", n.getUserId());
        row.put("orderId", n.getOrderId() == null ? "" : n.getOrderId());
        row.put("title", n.getTitle() == null ? "" : n.getTitle());
        row.put("message", n.getMessage() == null ? "" : n.getMessage());
        row.put("type", n.getType() == null ? "" : n.getType().name());
        row.put("isRead", n.isRead());
        row.put("createdAt", n.getCreatedAt());
        return row;
    }
}
