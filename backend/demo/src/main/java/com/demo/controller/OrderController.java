package com.demo.controller;

import com.demo.entity.Order;
import com.demo.entity.OrderAssignment;
import com.demo.entity.OrderStatus;
import com.demo.entity.PaymentRecord;
import com.demo.entity.DispatchTripRecord;
import com.demo.entity.DeliveryTrackingStatus;
import com.demo.entity.User;
import com.demo.entity.ConcreteProductStock;
import com.demo.repository.ConcreteProductStockRepository;
import com.demo.repository.DispatchTripRecordRepository;
import com.demo.repository.OrderAssignmentRepository;
import com.demo.repository.OrderRepository;
import com.demo.repository.PaymentRecordRepository;
import com.demo.repository.UserRepository;
import com.demo.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.HashMap;
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

    @Autowired
    private OrderAssignmentRepository orderAssignmentRepository;

    @Autowired
    private DispatchTripRecordRepository dispatchTripRecordRepository;

    @Autowired
    private OrderRepository orderRepository;

    // ✅ GET ALL
    @GetMapping
    public List<Order> getAllOrders() {
        return orderService.getAllOrders();
    }

    @GetMapping("/my-orders/{userId}")
    public List<Map<String, Object>> getMyOrders(@PathVariable Long userId) {
        return orderService.getOrdersByUserId(userId)
                .stream()
                .map(this::toCustomerOrderView)
                .collect(Collectors.toList());
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
            order.setOrderId(generateReadableOrderId(grade));
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

    private String generateReadableOrderId(String grade) {
        String gradeToken = sanitizeForOrderId(grade);
        if (gradeToken.isEmpty()) {
            gradeToken = "MIX";
        }

        LocalDateTime now = LocalDateTime.now();
        String dateToken = now.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String timeToken = now.format(DateTimeFormatter.ofPattern("HHmmss"));
        String base = "ORD-" + gradeToken + "-" + dateToken + "-" + timeToken;

        String candidate = base;
        int suffix = 1;
        while (orderRepository.findByOrderId(candidate).isPresent()) {
            candidate = base + "-" + suffix;
            suffix++;
        }
        return candidate;
    }

    private String sanitizeForOrderId(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.trim().toUpperCase().replaceAll("[^A-Z0-9]", "");
    }

    private Map<String, Object> toCustomerOrderView(Order order) {
        Map<String, Object> row = new HashMap<>();
        row.put("id", order.getId());
        row.put("orderId", order.getOrderId());
        row.put("grade", order.getGrade());
        row.put("quantity", order.getQuantity());
        row.put("totalPrice", order.getTotalPrice());
        row.put("address", order.getAddress());
        row.put("deliveryDate", order.getDeliveryDate());
        row.put("status", order.getStatus());
        row.put("latestNotification", order.getLatestNotification());
        row.put("dispatchDateTime", order.getDispatchDateTime());
        row.put("expectedArrivalTime", order.getExpectedArrivalTime());
        row.put("deliveryTrackingStatus", resolveTrackingStatus(order));
        row.put("deliveryTrackingStatusLabel", resolveTrackingStatusLabel(resolveTrackingStatus(order)));
        row.put("returnReason", order.getReturnReason());
        row.put("returnedQuantity", order.getReturnedQuantity());

        OrderAssignment assignment = orderAssignmentRepository.findByOrder_Id(order.getId()).orElse(null);
        row.put("transitMixerNumber",
                assignment != null && assignment.getTransitMixer() != null ? assignment.getTransitMixer().getMixerNumber() : null);
        row.put("transitMixerCapacityM3",
                assignment != null && assignment.getTransitMixer() != null ? assignment.getTransitMixer().getCapacityM3() : null);
        row.put("driverName",
                assignment != null && assignment.getDriver() != null ? assignment.getDriver().getDriverName() : null);
        row.put("driverShift",
                assignment != null && assignment.getDriver() != null ? assignment.getDriver().getDriverShift() : null);

        List<Map<String, Object>> trips = dispatchTripRecordRepository.findByOrder_IdOrderByTripNumberAsc(order.getId())
                .stream()
                .map(this::toTripView)
                .collect(Collectors.toList());
        row.put("tripDetails", trips);
        return row;
    }

    private Map<String, Object> toTripView(DispatchTripRecord trip) {
        Map<String, Object> row = new HashMap<>();
        row.put("tripNumber", trip.getTripNumber());
        row.put("status", trip.getStatus() == null ? "" : trip.getStatus().name());
        row.put("shift", trip.getShift());
        row.put("tripQuantityM3", trip.getTripQuantityM3());
        row.put("dispatchTime", trip.getScheduledDispatchTime());
        row.put("estimatedDeliveryTime", trip.getEstimatedDeliveryTime());
        row.put("transitMixerNumber", trip.getTransitMixerNumber());
        row.put("driverName", trip.getDriverName());
        row.put("returnReason", trip.getReturnReason());
        row.put("returnedQuantity", trip.getReturnedQuantity());
        return row;
    }

    private DeliveryTrackingStatus resolveTrackingStatus(Order order) {
        if (order.getStatus() == OrderStatus.RETURNED) return DeliveryTrackingStatus.RETURNED;
        if (order.getStatus() == OrderStatus.DELIVERED) return DeliveryTrackingStatus.DELIVERED;

        DeliveryTrackingStatus trackingStatus = order.getDeliveryTrackingStatus();
        if (trackingStatus == DeliveryTrackingStatus.ON_THE_WAY) return DeliveryTrackingStatus.IN_TRANSIT;
        if (order.getStatus() == OrderStatus.DISPATCHED) {
            return trackingStatus == null || trackingStatus == DeliveryTrackingStatus.SCHEDULED_FOR_DISPATCH
                    ? DeliveryTrackingStatus.DISPATCHED
                    : trackingStatus;
        }
        if (order.getStatus() == OrderStatus.IN_PRODUCTION
                || order.getStatus() == OrderStatus.PENDING_APPROVAL
                || order.getStatus() == OrderStatus.REJECTED) {
            return null;
        }
        if (order.getStatus() == OrderStatus.APPROVED) {
            return trackingStatus == DeliveryTrackingStatus.SCHEDULED_FOR_DISPATCH ? trackingStatus : null;
        }
        if (trackingStatus != null) return trackingStatus;
        if (order.getDispatchDateTime() != null) return DeliveryTrackingStatus.SCHEDULED_FOR_DISPATCH;
        return null;
    }

    private String resolveTrackingStatusLabel(DeliveryTrackingStatus status) {
        if (status == null) return null;
        switch (status) {
            case SCHEDULED_FOR_DISPATCH:
                return "SCHEDULED";
            case DISPATCHED:
                return "DISPATCHED";
            case ON_THE_WAY:
            case IN_TRANSIT:
                return "IN_TRANSIT";
            case DELIVERED:
                return "DELIVERED";
            case RETURNED:
                return "RETURNED";
            default:
                return status.name();
        }
    }
}
