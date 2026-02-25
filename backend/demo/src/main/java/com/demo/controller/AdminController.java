package com.demo.controller;

import com.demo.entity.Order;
import com.demo.entity.User;
import com.demo.entity.OrderStatus;
import com.demo.repository.OrderRepository;
import com.demo.repository.UserRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin("*")
public class AdminController {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private UserRepository userRepository;


    // ✅ 1. Get All Orders
    @GetMapping("/orders")
    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    // ✅ 2. Get Pending Orders
    @GetMapping("/orders/pending")
    public List<Order> getPendingOrders() {
        return orderRepository.findByStatus(OrderStatus.PENDING_APPROVAL);
    }

    // ✅ 3. Update Order Status (Approve / Reject / Dispatch etc.)
    @PutMapping("/orders/{orderId}/status")
    public ResponseEntity<?> updateOrderStatus(
            @PathVariable String orderId,
            @RequestParam String status) {

        Order order = orderRepository.findByOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        try {
            OrderStatus newStatus = OrderStatus.valueOf(status.toUpperCase());
            order.setStatus(newStatus);
            orderRepository.save(order);

            return ResponseEntity.ok(Map.of(
                    "message", "Order status updated successfully",
                    "orderId", order.getOrderId(),
                    "newStatus", order.getStatus()
            ));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Invalid status value"));
        }
    }

    // ✅ 4. Get All Users (Optional Admin Feature)
    @GetMapping("/users")
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @GetMapping("/admin-logins/pending")
    public List<User> getPendingAdminLogins() {
        return userRepository.findByRoleAndApprovalStatus("ADMIN", "PENDING_APPROVAL");
    }

    @PutMapping("/admin-logins/{userId}/approve")
    public ResponseEntity<?> approveAdminLogin(@PathVariable Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!"ADMIN".equals(user.getRole())) {
            return ResponseEntity.badRequest().body(Map.of("message", "User is not an admin"));
        }

        user.setApprovalStatus("APPROVED");
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Admin approved successfully"));
    }

    @PutMapping("/admin-logins/{userId}/reject")
    public ResponseEntity<?> rejectAdminLogin(@PathVariable Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!"ADMIN".equals(user.getRole())) {
            return ResponseEntity.badRequest().body(Map.of("message", "User is not an admin"));
        }

        user.setApprovalStatus("REJECTED");
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Admin rejected successfully"));
    }
    @PutMapping("/orders/{orderId}/approve")
    public ResponseEntity<?> approveOrder(@PathVariable String orderId) {

        Order order = orderRepository.findByOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        order.setStatus(OrderStatus.APPROVED);
        order.setApprovedAt(LocalDateTime.now());

        orderRepository.save(order);

        return ResponseEntity.ok("Order Approved");
    }
    @PutMapping("/orders/{orderId}/reject")
    public ResponseEntity<?> rejectOrder(@PathVariable String orderId) {

        Order order = orderRepository.findByOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        order.setStatus(OrderStatus.REJECTED);
        orderRepository.save(order);

        return ResponseEntity.ok("Order Rejected");
    }

    @DeleteMapping("/orders/{orderId}")
    public ResponseEntity<?> deleteOrder(@PathVariable String orderId) {
        try {
            int deleted = orderRepository.deleteByOrderId(orderId);

            if (deleted == 0) {
                return ResponseEntity.status(404).body(Map.of(
                        "message", "Order not found",
                        "orderId", orderId
                ));
            }

            return ResponseEntity.ok(Map.of(
                    "message", "Order deleted successfully",
                    "orderId", orderId
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "message", "Unable to delete order",
                    "error", e.getMessage()
            ));
        }
    }

}
