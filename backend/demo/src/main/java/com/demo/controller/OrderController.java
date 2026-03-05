package com.demo.controller;

import com.demo.entity.Order;
import com.demo.entity.OrderStatus;
import com.demo.entity.PaymentRecord;
import com.demo.entity.User;
import com.demo.entity.ConcreteProductStock;
import com.demo.repository.ConcreteProductStockRepository;
import com.demo.repository.PaymentRecordRepository;
import com.demo.repository.UserRepository;
import com.demo.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin("*")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PaymentRecordRepository paymentRecordRepository;

    @Autowired
    private ConcreteProductStockRepository productStockRepository;

    // ✅ GET ALL
    @GetMapping
    public List<Order> getAllOrders() {
        return orderService.getAllOrders();
    }

    @GetMapping("/my-orders/{userId}")
    public List<Order> getMyOrders(@PathVariable Long userId) {
        return orderService.getOrdersByUserId(userId);
    }

    @GetMapping("/{orderId}/payments")
    public ResponseEntity<?> getOrderPayments(@PathVariable String orderId) {
        List<Map<String, Object>> response = paymentRecordRepository
                .findByOrder_OrderIdOrderByPaidAtDesc(orderId)
                .stream()
                .map(this::toPaymentView)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{orderId}/payments")
    public ResponseEntity<?> addOrderPayment(
            @PathVariable String orderId,
            @RequestBody Map<String, Object> payload
    ) {
        try {
            Order order = orderService.getOrderByOrderId(orderId);

            double amount = Double.parseDouble(String.valueOf(payload.getOrDefault("amount", 0)));
            String method = String.valueOf(payload.getOrDefault("method", "")).trim();

            if (amount <= 0 || method.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Invalid payment details"));
            }

            PaymentRecord record = new PaymentRecord();
            record.setOrder(order);
            record.setAmount(amount);
            record.setMethod(method);
            record.setPaidAt(LocalDateTime.now());
            record.setTransactionId("TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());

            PaymentRecord saved = paymentRecordRepository.save(record);

            return ResponseEntity.ok(Map.of(
                    "message", "Payment saved successfully",
                    "payment", toPaymentView(saved)
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Unable to save payment"));
        }
    }

    // ✅ GET BY ID
    @GetMapping("/{id}")
    public ResponseEntity<?> getOrderById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(orderService.getOrderById(id));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // ✅ GET BY ORDER ID (Custom Order ID)
    @GetMapping("/orderId/{orderId}")
    public ResponseEntity<?> getOrderByOrderId(@PathVariable String orderId) {
        try {
            return ResponseEntity.ok(orderService.getOrderByOrderId(orderId));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // ✅ CREATE ORDER
    @PostMapping("/create")
    public ResponseEntity<?> createOrder(@RequestBody Map<String, Object> payload) {
        try {
            Object userIdValue = payload.get("userId");
            if (userIdValue == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "userId is required"));
            }

            Long userId = Long.valueOf(String.valueOf(userIdValue));
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            String grade = String.valueOf(payload.getOrDefault("grade", "")).trim();
            double quantity = Double.parseDouble(String.valueOf(payload.getOrDefault("quantity", 0)));
            String address = String.valueOf(payload.getOrDefault("address", "")).trim();

            if (grade.isEmpty() || quantity <= 0 || address.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Invalid order details"));
            }

            ConcreteProductStock product = productStockRepository.findByNameIgnoreCase(grade)
                    .orElse(null);
            if (product == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Selected product is not available"));
            }
            if (product.getAvailableQuantity() < quantity) {
                return ResponseEntity.badRequest().body(Map.of("message", "Out of stock. Please wait for restock."));
            }

            Order order = new Order();
            order.setOrderId("ORD-" + UUID.randomUUID().toString().substring(0, 8));
            order.setGrade(grade);
            order.setQuantity(quantity);
            order.setAddress(address);
            order.setStatus(OrderStatus.APPROVED);
            order.setTotalPrice(resolveTotalPrice(grade, quantity, payload.get("totalPrice")));
            order.setUser(user);

            Object deliveryDateValue = payload.get("deliveryDate");
            if (deliveryDateValue != null) {
                String deliveryDate = String.valueOf(deliveryDateValue).trim();
                if (!deliveryDate.isEmpty()) {
                    order.setDeliveryDate(LocalDateTime.parse(deliveryDate));
                }
            }

            Order saved = orderService.createOrder(order);
            product.setAvailableQuantity(product.getAvailableQuantity() - quantity);
            product.setUpdatedAt(LocalDateTime.now());
            productStockRepository.save(product);

            return ResponseEntity.ok(Map.of(
                    "message", "Order created successfully",
                    "id", saved.getId(),
                    "orderId", saved.getOrderId(),
                    "grade", saved.getGrade(),
                    "quantity", saved.getQuantity(),
                    "status", saved.getStatus(),
                    "totalPrice", saved.getTotalPrice()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Unable to create order"));
        }
    }

    // ✅ UPDATE ORDER
    @PutMapping("/{id}")
    public ResponseEntity<?> updateOrder(
            @PathVariable Long id,
            @RequestBody Order order) {

        try {
            orderService.updateOrder(id, order);
            return ResponseEntity.ok(Map.of(
                    "message", "Order updated successfully"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // ✅ DELETE ORDER
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteOrder(@PathVariable Long id) {

        try {
            orderService.deleteOrder(id);
            return ResponseEntity.ok(Map.of(
                    "message", "Order deleted successfully"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    private double resolveTotalPrice(String grade, double quantity, Object totalPriceFromPayload) {
        if (totalPriceFromPayload != null) {
            try {
                double fromPayload = Double.parseDouble(String.valueOf(totalPriceFromPayload));
                if (fromPayload > 0) {
                    return fromPayload;
                }
            } catch (NumberFormatException ignored) {
                // Fall back to calculated pricing if payload value is invalid.
            }
        }

        double rate;
        switch (grade.toUpperCase()) {
            case "M20":
                rate = 5000;
                break;
            case "M25":
                rate = 5500;
                break;
            case "M30":
                rate = 6000;
                break;
            case "M35":
                rate = 6500;
                break;
            default:
                rate = 0;
        }
        return rate * quantity;
    }

    private Map<String, Object> toPaymentView(PaymentRecord p) {
        return Map.of(
                "id", p.getId(),
                "orderId", p.getOrder() != null ? p.getOrder().getOrderId() : null,
                "amount", p.getAmount(),
                "method", p.getMethod(),
                "paidAt", p.getPaidAt(),
                "transactionId", p.getTransactionId()
        );
    }
}
