package com.demo.controller;

import com.demo.entity.Order;
import com.demo.entity.OrderApprovalHistory;
import com.demo.entity.OrderAssignment;
import com.demo.entity.OrderStatus;
import com.demo.entity.NotificationType;
import com.demo.entity.PaymentRecord;
import com.demo.entity.DispatchTripRecord;
import com.demo.entity.DeliveryTrackingStatus;
import com.demo.entity.User;
import com.demo.entity.ConcreteProductStock;
import com.demo.repository.ConcreteProductStockRepository;
import com.demo.repository.DispatchTripRecordRepository;
import com.demo.repository.OrderApprovalHistoryRepository;
import com.demo.repository.OrderAssignmentRepository;
import com.demo.repository.OrderRepository;
import com.demo.repository.PaymentRecordRepository;
import com.demo.repository.UserRepository;
import com.demo.service.OrderService;
import com.demo.service.OrderNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
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
    private OrderNotificationService orderNotificationService;

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

    @Autowired
    private OrderApprovalHistoryRepository approvalHistoryRepository;

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
                LocalDateTime paidAt = LocalDateTime.now();
                record.setPaidAt(paidAt);
            record.setTransactionId("TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());

            PaymentRecord saved = paymentRecordRepository.save(record);

                order.setPaymentReceivedAt(paidAt);
                order.setOrderWorkflowStatus("PAID");
                order.setStatus(OrderStatus.APPROVED);
                order.setLatestNotification("Payment successful. Your order has been placed successfully.");
                orderRepository.save(order);

            // Log payment history
            approvalHistoryRepository.save(new OrderApprovalHistory(
                    order.getOrderId(),
                    "PAYMENT_COMPLETED",
                    "Customer",
                    paidAt,
                    "Payment completed successfully via " + method + "."
            ));

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

    @GetMapping("/approval-history/{orderId}")
    public ResponseEntity<?> getApprovalHistory(@PathVariable String orderId) {
        try {
            List<Map<String, Object>> history = approvalHistoryRepository
                    .findByOrderIdOrderByActionTimeDesc(orderId)
                    .stream()
                    .map(h -> {
                        Map<String, Object> row = new HashMap<>();
                        row.put("id", h.getId());
                        row.put("orderId", h.getOrderId());
                        row.put("status", h.getStatus());
                        row.put("actionBy", h.getActionBy());
                        row.put("actionTime", h.getActionTime());
                        row.put("remarks", h.getRemarks());
                        return row;
                    })
                    .collect(Collectors.toList());
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Unable to load approval history"));
        }
    }

    @GetMapping("/status/{orderId}")
    public ResponseEntity<?> getOrderApprovalStatus(@PathVariable String orderId) {
        try {
            Order order = orderService.getOrderByOrderId(orderId);
            String paymentOption = order.getPaymentOption() == null ? "" : order.getPaymentOption().trim().toUpperCase();

            if ("PAY_LATER".equals(paymentOption)) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "This endpoint is only for ONLINE and CASH_ON_DELIVERY orders"
                ));
            }

            Map<String, Object> response = new HashMap<>();
            response.put("orderId", order.getOrderId());
            response.put("grade", order.getGrade());
            response.put("quantity", order.getQuantity());
            response.put("totalPrice", order.getTotalPrice());
            response.put("paymentMethod", order.getPaymentOption());
            response.put("paymentType", order.getPaymentType());
            response.put("paymentStatus", resolvePaymentStatus(order));
            response.put("status", order.getStatus());
            response.put("orderWorkflowStatus", order.getOrderWorkflowStatus());
            response.put("paymentReceivedAt", order.getPaymentReceivedAt());
            response.put("address", order.getAddress());
            response.put("deliveryDate", order.getDeliveryDate());
            response.put("createdAt", order.getCreatedAt());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
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

            Long userId;
            try {
                userId = Long.valueOf(String.valueOf(userIdValue).trim());
            } catch (Exception ex) {
                return ResponseEntity.badRequest().body(Map.of("message", "Invalid userId"));
            }

            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            String grade = String.valueOf(payload.getOrDefault("grade", "")).trim();
            double quantity;
            try {
                quantity = Double.parseDouble(String.valueOf(payload.getOrDefault("quantity", 0)).trim());
            } catch (Exception ex) {
                return ResponseEntity.badRequest().body(Map.of("message", "Invalid quantity"));
            }
            String address = String.valueOf(payload.getOrDefault("address", "")).trim();

            if (grade.isEmpty() || quantity <= 0 || !Double.isFinite(quantity) || address.isEmpty()) {
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
            LocalDateTime now = LocalDateTime.now();
            order.setOrderId(generateReadableOrderId(grade));
            order.setGrade(grade);
            order.setQuantity(quantity);
            order.setAddress(address);
            order.setTotalPrice(resolveTotalPrice(grade, quantity, payload.get("totalPrice")));
            order.setUser(user);
            order.setCreatedAt(now);

            Object deliveryDateValue = payload.get("deliveryDate");
            if (deliveryDateValue != null) {
                String deliveryDate = String.valueOf(deliveryDateValue).trim();
                if (!deliveryDate.isEmpty()) {
                    order.setDeliveryDate(parseDeliveryDateTime(deliveryDate));
                }
            }

            String paymentOption = String.valueOf(payload.getOrDefault("paymentOption", "ONLINE")).trim().toUpperCase();
            if (paymentOption.isEmpty()) {
                paymentOption = "ONLINE";
            }

            if ("PAY_LATER".equals(paymentOption)) {
                int creditDays = parseCreditDays(payload.get("creditDays"));
                order.setPaymentOption("PAY_LATER");
                order.setPaymentType("PAY_LATER");
                order.setCreditDays(creditDays);
                order.setCreditPeriod(resolveCreditPeriodLabel(creditDays));
                order.setCreditStatus("PENDING_APPROVAL");
                order.setCreditApprovalStatus("PENDING_APPROVAL");
                order.setCreditRequestedAt(now);
                order.setCreditDueDate(now.plusDays(creditDays));
                order.setOrderWorkflowStatus("WAITING_ADMIN_APPROVAL");
                order.setStatus(OrderStatus.PENDING_APPROVAL);
                order.setLatestNotification("Pending admin credit approval");
            } else {
                order.setPaymentOption(paymentOption);
                order.setPaymentType(paymentOption);
                order.setCreditStatus("NOT_APPLICABLE");
                order.setCreditApprovalStatus("NOT_APPLICABLE");
                order.setOrderWorkflowStatus("WAITING_ADMIN_APPROVAL");
                order.setStatus(OrderStatus.PENDING_APPROVAL);
                order.setLatestNotification("Your order is waiting for admin approval");
            }

            Order saved = orderService.createOrder(order);
            product.setAvailableQuantity(product.getAvailableQuantity() - quantity);
            product.setUpdatedAt(LocalDateTime.now());
            productStockRepository.save(product);

            // Log creation history
            approvalHistoryRepository.save(new OrderApprovalHistory(
                    saved.getOrderId(),
                    "ORDER_CREATED",
                    "Customer",
                    saved.getCreatedAt() != null ? saved.getCreatedAt() : LocalDateTime.now(),
                    "Order placed successfully. Waiting for admin approval."
            ));
                approvalHistoryRepository.save(new OrderApprovalHistory(
                    saved.getOrderId(),
                    "PENDING_APPROVAL",
                    "System",
                    LocalDateTime.now(),
                    "Waiting for admin approval."
                ));

            if ("PAY_LATER".equalsIgnoreCase(saved.getPaymentOption())) {
                orderNotificationService.createNotification(
                        saved,
                        NotificationType.PAY_LATER_REQUESTED,
                        "Pending admin credit approval for order " + saved.getOrderId()
                );
            }

                Map<String, Object> response = new HashMap<>();
                response.put("message", "Order created successfully");
                response.put("id", saved.getId());
                response.put("orderId", saved.getOrderId());
                response.put("grade", saved.getGrade());
                response.put("quantity", saved.getQuantity());
                response.put("status", saved.getStatus());
                response.put("address", saved.getAddress());
                response.put("paymentOption", saved.getPaymentOption());
                response.put("paymentType", saved.getPaymentType());
                response.put("creditPeriod", saved.getCreditPeriod());
                response.put("creditStatus", saved.getCreditStatus());
                response.put("orderWorkflowStatus", saved.getOrderWorkflowStatus());
                response.put("creditDueDate", saved.getCreditDueDate());
                response.put("totalPrice", saved.getTotalPrice());
                return ResponseEntity.ok(response);
        } catch (DateTimeParseException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid delivery date/time format"));
        } catch (Exception e) {
            String message = (e.getMessage() == null || e.getMessage().isBlank())
                    ? "Unable to create order"
                    : e.getMessage();
            return ResponseEntity.badRequest().body(Map.of("message", message));
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

    private String resolvePaymentStatus(Order order) {
        if (order == null) {
            return "PENDING";
        }

        String paymentOption = String.valueOf(order.getPaymentOption() == null ? "" : order.getPaymentOption()).trim().toUpperCase();
        if ("CASH_ON_DELIVERY".equals(paymentOption) || "PAY_LATER".equals(paymentOption)) {
            return "NOT_REQUIRED";
        }

        return order.getPaymentReceivedAt() != null ? "PAID" : "PENDING";
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
        row.put("customerName", order.getUser() != null ? order.getUser().getName() : null);
        row.put("customerId", order.getUser() != null ? order.getUser().getId() : null);
        row.put("customerPhone", order.getUser() != null ? order.getUser().getNumber() : null);
        row.put("customerEmail", order.getUser() != null ? order.getUser().getEmail() : null);
        row.put("createdAt", order.getCreatedAt());
        row.put("deliveryDate", order.getDeliveryDate());
        row.put("status", order.getStatus());
        row.put("orderWorkflowStatus", order.getOrderWorkflowStatus());
        row.put("paymentType", order.getPaymentType());
        row.put("latestNotification", order.getLatestNotification());
        row.put("paymentOption", order.getPaymentOption());
        row.put("creditPeriod", order.getCreditPeriod());
        row.put("creditDays", order.getCreditDays());
        row.put("creditStatus", order.getCreditStatus());
        row.put("creditApprovalStatus", order.getCreditApprovalStatus());
        row.put("creditRequestedAt", order.getCreditRequestedAt());
        row.put("creditReviewedAt", order.getCreditReviewedAt());
        row.put("creditDueDate", order.getCreditDueDate());
        row.put("creditReviewRemark", order.getCreditReviewRemark());
        row.put("paymentReceivedAt", order.getPaymentReceivedAt());
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

    private int parseCreditDays(Object rawValue) {
        if (rawValue == null) {
            return 15;
        }
        try {
            int parsed = Integer.parseInt(String.valueOf(rawValue).trim());
            return parsed <= 15 ? 15 : 30;
        } catch (NumberFormatException ignored) {
            return 15;
        }
    }

    private String resolveCreditPeriodLabel(int creditDays) {
        return creditDays <= 15 ? "7 - 15 Days" : "15 - 30 Days";
    }

    private LocalDateTime parseDeliveryDateTime(String value) {
        String trimmed = value == null ? "" : value.trim();
        if (trimmed.isEmpty()) {
            throw new DateTimeParseException("Invalid delivery date", value, 0);
        }

        if (trimmed.length() == 16) {
            return LocalDateTime.parse(trimmed + ":00");
        }

        return LocalDateTime.parse(trimmed);
    }
}
