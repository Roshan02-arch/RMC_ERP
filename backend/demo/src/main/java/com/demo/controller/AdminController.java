package com.demo.controller;

import com.demo.dto.DispatchDeliveryStatusRequest;
import com.demo.dto.DispatchScheduleRequest;
import com.demo.dto.ProductionScheduleRequest;
import com.demo.dto.RescheduleRequest;
import com.demo.dto.TripRecordRequest;
import com.demo.dto.VehicleScheduleRequest;
import com.demo.entity.DeliveryTrackingStatus;
import com.demo.entity.DispatchTripRecord;
import com.demo.entity.DispatchTripStatus;
import com.demo.entity.Driver;
import com.demo.entity.Order;
import com.demo.entity.OrderAssignment;
import com.demo.entity.OrderStatus;
import com.demo.entity.PaymentRecord;
import com.demo.entity.CustomerNotification;
import com.demo.entity.TransitMixer;
import com.demo.entity.User;
import com.demo.repository.CustomerNotificationRepository;
import com.demo.repository.DispatchTripRecordRepository;
import com.demo.repository.DriverRepository;
import com.demo.repository.OrderAssignmentRepository;
import com.demo.repository.OrderRepository;
import com.demo.repository.PaymentRecordRepository;
import com.demo.repository.QualityInspectionRepository;
import com.demo.repository.TransitMixerRepository;
import com.demo.repository.UserRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin("*")
public class AdminController {

    private static final Logger logger = LoggerFactory.getLogger(AdminController.class);

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrderAssignmentRepository orderAssignmentRepository;

    @Autowired
    private DriverRepository driverRepository;

    @Autowired
    private TransitMixerRepository transitMixerRepository;

    @Autowired
    private DispatchTripRecordRepository dispatchTripRecordRepository;

    @Autowired
    private PaymentRecordRepository paymentRecordRepository;

    @Autowired
    private QualityInspectionRepository qualityInspectionRepository;

    @Autowired
    private CustomerNotificationRepository customerNotificationRepository;


    // ? 1. Get All Orders
    @GetMapping("/orders")
    public List<Map<String, Object>> getAllOrders() {
        List<Map<String, Object>> response = new ArrayList<>();
        for (Order order : orderRepository.findAll(Sort.by(Sort.Direction.DESC, "id"))) {
            response.add(toOrderView(order));
        }
        return response;
    }

    // ? 2. Get Pending Orders
    @GetMapping("/orders/pending")
    public List<Map<String, Object>> getPendingOrders() {
        List<Map<String, Object>> response = new ArrayList<>();
        for (Order order : orderRepository.findByStatus(OrderStatus.PENDING_APPROVAL)) {
            response.add(toOrderView(order));
        }
        return response;
    }

    // ? 3. Update Order Status (Approve / Reject / Dispatch etc.)
    @PutMapping("/orders/{orderId}/status")
    public ResponseEntity<?> updateOrderStatus(
            @PathVariable String orderId,
            @RequestParam String status) {

        Order order = orderRepository.findByOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        try {
            OrderStatus newStatus = OrderStatus.valueOf(status.toUpperCase());
            order.setStatus(newStatus);
            if (newStatus == OrderStatus.APPROVED && order.getApprovedAt() == null) {
                order.setApprovedAt(LocalDateTime.now());
            }
            if (newStatus == OrderStatus.DELIVERED) {
                order.setDeliveryTrackingStatus(DeliveryTrackingStatus.DELIVERED);
                if (order.getDeliveredAt() == null) {
                    order.setDeliveredAt(LocalDateTime.now());
                }
                order.setLatestNotification("Order completed successfully");
            } else if (newStatus == OrderStatus.DISPATCHED) {
                order.setDeliveryTrackingStatus(DeliveryTrackingStatus.DISPATCHED);
            } else if (newStatus == OrderStatus.APPROVED) {
                order.setLatestNotification("Order approved by admin");
            } else if (newStatus == OrderStatus.REJECTED) {
                order.setLatestNotification("Order rejected by admin");
            }
            orderRepository.save(order);

            if (newStatus == OrderStatus.APPROVED) {
                createNotification(order, "Order approved", "Your order " + order.getOrderId() + " is approved by admin.", "ORDER", null);
            } else if (newStatus == OrderStatus.REJECTED) {
                createNotification(order, "Order rejected", "Your order " + order.getOrderId() + " was rejected by admin.", "ORDER", null);
            } else if (newStatus == OrderStatus.DELIVERED) {
                createNotification(order, "Order completed", "Order " + order.getOrderId() + " has been completed successfully.", "DELIVERY", null);
            }

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

    // ? 4. Get All Users (Optional Admin Feature)
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
        if ("PAY_LATER".equalsIgnoreCase(order.getPaymentOption())) {
            order.setCreditApprovalStatus("APPROVED");
            order.setCreditReviewedAt(LocalDateTime.now());
            order.setLatestNotification("Credit approved by admin");
        }

        orderRepository.save(order);
        createNotification(order, "Order approved", "Your order " + order.getOrderId() + " is approved by admin.", "ORDER", null);

        return ResponseEntity.ok("Order Approved");
    }
    @PutMapping("/orders/{orderId}/reject")
    public ResponseEntity<?> rejectOrder(@PathVariable String orderId) {

        Order order = orderRepository.findByOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        order.setStatus(OrderStatus.REJECTED);
        if ("PAY_LATER".equalsIgnoreCase(order.getPaymentOption())) {
            order.setCreditApprovalStatus("REJECTED");
            order.setCreditReviewedAt(LocalDateTime.now());
            order.setLatestNotification("Admin rejected credit request. Complete payment to continue.");
        }
        orderRepository.save(order);
        createNotification(order, "Order rejected", "Your order " + order.getOrderId() + " was rejected by admin.", "ORDER", null);

        return ResponseEntity.ok("Order Rejected");
    }

    @PutMapping("/orders/{orderId}/credit/approve")
    public ResponseEntity<?> approveCreditOrder(
            @PathVariable String orderId,
            @RequestBody(required = false) Map<String, Object> payload) {
        try {
            Order order = orderRepository.findByOrderId(orderId)
                    .orElseThrow(() -> new RuntimeException("Order not found"));

            if (!"PAY_LATER".equalsIgnoreCase(order.getPaymentOption())) {
                return ResponseEntity.badRequest().body(Map.of("message", "This order is not a pay later order"));
            }

            String remark = payload != null ? String.valueOf(payload.getOrDefault("remark", "")).trim() : "";

            order.setStatus(OrderStatus.APPROVED);
            order.setApprovedAt(LocalDateTime.now());
            order.setCreditApprovalStatus("APPROVED");
            order.setCreditReviewedAt(LocalDateTime.now());
            if (order.getCreditDueDate() == null && order.getCreditDays() != null && order.getCreditDays() > 0) {
                order.setCreditDueDate(LocalDateTime.now().plusDays(order.getCreditDays()));
            }
            if (!remark.isEmpty()) {
                order.setCreditReviewRemark(remark);
            }
            order.setLatestNotification("Credit approved by admin");
            orderRepository.save(order);
            createNotification(order, "Credit approved", "Credit approved for order " + order.getOrderId() + ". Due date: " + order.getCreditDueDate(), "CREDIT", null);

            return ResponseEntity.ok(Map.of("message", "Credit approved successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            logger.error("Failed to approve credit for order {}", orderId, e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "message", e.getMessage() == null || e.getMessage().isBlank() ? "Unable to approve credit order" : e.getMessage()
            ));
        }
    }

    @PutMapping("/orders/{orderId}/credit/reject")
    public ResponseEntity<?> rejectCreditOrder(
            @PathVariable String orderId,
            @RequestBody(required = false) Map<String, Object> payload) {
        try {
            Order order = orderRepository.findByOrderId(orderId)
                    .orElseThrow(() -> new RuntimeException("Order not found"));

            if (!"PAY_LATER".equalsIgnoreCase(order.getPaymentOption())) {
                return ResponseEntity.badRequest().body(Map.of("message", "This order is not a pay later order"));
            }

            String remark = payload != null ? String.valueOf(payload.getOrDefault("remark", "")).trim() : "";

            order.setStatus(OrderStatus.REJECTED);
            order.setCreditApprovalStatus("REJECTED");
            order.setCreditReviewedAt(LocalDateTime.now());
            order.setCreditReviewRemark(remark.isEmpty() ? "Credit request rejected by admin" : remark);
            order.setLatestNotification("Admin rejected credit request. Complete payment to continue.");
            orderRepository.save(order);
            createNotification(order, "Credit rejected", "Credit rejected for order " + order.getOrderId() + ". Please complete payment to place order.", "CREDIT", null);

            return ResponseEntity.ok(Map.of("message", "Credit rejected successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            logger.error("Failed to reject credit for order {}", orderId, e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "message", e.getMessage() == null || e.getMessage().isBlank() ? "Unable to reject credit order" : e.getMessage()
            ));
        }
    }

    @PostMapping("/orders/{orderId}/payment/complete")
    public ResponseEntity<?> markPaymentComplete(@PathVariable String orderId) {
        Order order = orderRepository.findByOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        double subtotal = order.getTotalPrice();
        double totalPayable = subtotal + ((subtotal * 18.0) / 100.0);
        double totalPaid = paymentRecordRepository.findByOrder_Id(order.getId())
                .stream()
                .filter(record -> record.getMethod() == null
                        || !record.getMethod().trim().toUpperCase().startsWith("CASH_ON_DELIVERY"))
                .mapToDouble(PaymentRecord::getAmount)
                .sum();
        double outstanding = Math.max(0, totalPayable - totalPaid);

        if (outstanding <= 0.0) {
            return ResponseEntity.ok(Map.of("message", "Payment already completed"));
        }

        PaymentRecord record = new PaymentRecord();
        record.setOrder(order);
        record.setAmount(outstanding);
        record.setMethod("ADMIN_MARKED_COMPLETE");
        record.setPaidAt(LocalDateTime.now());
        record.setTransactionId("TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        paymentRecordRepository.save(record);

        order.setLatestNotification("Payment marked complete by admin");
        orderRepository.save(order);
        createNotification(order, "Payment completed", "Payment completed for order " + order.getOrderId() + ".", "PAYMENT", null);

        return ResponseEntity.ok(Map.of(
                "message", "Payment marked complete successfully",
                "amount", outstanding
        ));
    }

    @DeleteMapping("/orders/{orderId}")
    @Transactional
    public ResponseEntity<?> deleteOrder(@PathVariable String orderId) {
        try {
            Order order = orderRepository.findByOrderId(orderId).orElse(null);
            if (order == null) {
                return ResponseEntity.status(404).body(Map.of(
                        "message", "Order not found",
                        "orderId", orderId
                ));
            }

            Long internalOrderId = order.getId();
            List<DispatchTripRecord> tripRecords = dispatchTripRecordRepository.findByOrder_IdOrderByTripNumberAsc(internalOrderId);
            if (!tripRecords.isEmpty()) {
                dispatchTripRecordRepository.deleteAll(tripRecords);
            }

            List<PaymentRecord> paymentRecords = paymentRecordRepository.findByOrder_Id(internalOrderId);
            if (!paymentRecords.isEmpty()) {
                paymentRecordRepository.deleteAll(paymentRecords);
            }

            OrderAssignment assignment = orderAssignmentRepository.findByOrder_Id(internalOrderId).orElse(null);
            if (assignment != null) {
                orderAssignmentRepository.delete(assignment);
            }

            qualityInspectionRepository.deleteByOrder_Id(internalOrderId);

            orderRepository.delete(order);

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

    @PutMapping("/orders/{orderId}/schedule/production")
    public ResponseEntity<?> scheduleProduction(
            @PathVariable String orderId,
            @RequestParam Long adminUserId,
            @RequestBody ProductionScheduleRequest request) {

        ResponseEntity<?> adminValidation = validateAdmin(adminUserId);
        if (adminValidation != null) {
            return adminValidation;
        }

        Order order = orderRepository.findByOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (request.getProductionDate() == null
                || request.getProductionSlotStart() == null
                || request.getProductionSlotEnd() == null
                || request.getPlantAllocation() == null
                || request.getPriorityLevel() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "All production scheduling fields are required"));
        }

        if (!request.getProductionSlotEnd().isAfter(request.getProductionSlotStart())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Production slot end must be after start"));
        }

        order.setProductionDate(request.getProductionDate());
        order.setProductionSlotStart(request.getProductionSlotStart());
        order.setProductionSlotEnd(request.getProductionSlotEnd());
        order.setStatus(OrderStatus.IN_PRODUCTION);
        order.setLatestNotification("Production schedule updated by admin");

        OrderAssignment assignment = getOrCreateAssignment(order);
        assignment.setPlantAllocation(request.getPlantAllocation());
        assignment.setPriorityLevel(request.getPriorityLevel());
        orderAssignmentRepository.save(assignment);
        orderRepository.save(order);
        createNotification(order, "Order scheduled", "Production scheduled for order " + order.getOrderId() + ".", "SCHEDULE", null);

        return ResponseEntity.ok(Map.of(
                "message", "Production scheduled successfully",
                "orderId", order.getOrderId()
        ));
    }

    @PutMapping("/orders/{orderId}/schedule/dispatch")
    public ResponseEntity<?> scheduleDispatch(
            @PathVariable String orderId,
            @RequestParam Long adminUserId,
            @RequestBody DispatchScheduleRequest request) {

        ResponseEntity<?> adminValidation = validateAdmin(adminUserId);
        if (adminValidation != null) {
            return adminValidation;
        }

        Order order = orderRepository.findByOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (request.getDispatchDateTime() == null
                || request.getTripPlanning() == null
                || request.getDeliverySequence() == null
                || request.getExpectedArrivalTime() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "All dispatch scheduling fields are required"));
        }

        if (!request.getExpectedArrivalTime().isAfter(request.getDispatchDateTime())) {
            return ResponseEntity.badRequest().body(Map.of("message", "ETA must be after dispatch time"));
        }

        if (order.getStatus() != OrderStatus.APPROVED
                && order.getStatus() != OrderStatus.IN_PRODUCTION
                && order.getStatus() != OrderStatus.DISPATCHED) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Only approved or in-production orders can be dispatched"
            ));
        }

        String tripPlanning = request.getTripPlanning().trim().toUpperCase();
        if (!"SINGLE_TRIP".equals(tripPlanning) && !"MULTIPLE_TRIPS".equals(tripPlanning)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Trip planning must be SINGLE_TRIP or MULTIPLE_TRIPS"));
        }

        int plannedTrips = request.getPlannedTrips() == null
                ? ("MULTIPLE_TRIPS".equals(tripPlanning) ? 2 : 1)
                : request.getPlannedTrips();
        if (plannedTrips < 1) {
            return ResponseEntity.badRequest().body(Map.of("message", "Planned trips must be at least 1"));
        }
        if ("SINGLE_TRIP".equals(tripPlanning)) {
            plannedTrips = 1;
        } else if (plannedTrips < 2) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "For MULTIPLE_TRIPS, planned trips must be at least 2"
            ));
        }

        order.setDispatchDateTime(request.getDispatchDateTime());
        order.setTripPlanning(tripPlanning);
        order.setDeliverySequence(request.getDeliverySequence().trim());
        order.setExpectedArrivalTime(request.getExpectedArrivalTime());
        order.setPlannedTrips(plannedTrips);
        if (order.getCompletedTrips() == null) {
            order.setCompletedTrips(0);
        }
        if (order.getTotalFuelUsedLiters() == null) {
            order.setTotalFuelUsedLiters(0.0);
        }
        order.setStatus(OrderStatus.DISPATCHED);
        order.setDeliveryTrackingStatus(DeliveryTrackingStatus.SCHEDULED_FOR_DISPATCH);
        order.setLatestNotification("Dispatch scheduled successfully");
        orderRepository.save(order);
        createNotification(order, "Dispatch scheduled", "Dispatch scheduled for order " + order.getOrderId() + ".", "DELIVERY", null);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Dispatch scheduled successfully");
        response.put("orderId", order.getOrderId());
        response.put("tripPlanning", order.getTripPlanning());
        response.put("plannedTrips", order.getPlannedTrips());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/orders/{orderId}/schedule/vehicle")
    public ResponseEntity<?> scheduleVehicleAndDriver(
            @PathVariable String orderId,
            @RequestParam Long adminUserId,
            @RequestBody VehicleScheduleRequest request) {

        ResponseEntity<?> adminValidation = validateAdmin(adminUserId);
        if (adminValidation != null) {
            return adminValidation;
        }

        Order order = orderRepository.findByOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (order.getStatus() != OrderStatus.APPROVED
                && order.getStatus() != OrderStatus.IN_PRODUCTION
                && order.getStatus() != OrderStatus.DISPATCHED) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Transit mixer can be assigned only to approved or in-production orders"
            ));
        }

        if (isBlank(request.getTransitMixerNumber())
                || isBlank(request.getDriverName())
                || isBlank(request.getDriverShift())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Transit mixer number, driver name and shift are required"
            ));
        }

        if (order.getDispatchDateTime() == null || order.getExpectedArrivalTime() == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Dispatch time and ETA must be set before vehicle assignment"
            ));
        }

        OrderAssignment current = getOrCreateAssignment(order);
        LocalDateTime start = order.getDispatchDateTime();
        LocalDateTime end = order.getExpectedArrivalTime();

        for (OrderAssignment assignment : orderAssignmentRepository.findAll()) {
            if (assignment.getOrder() == null || Objects.equals(assignment.getOrder().getId(), order.getId())) {
                continue;
            }
            Order otherOrder = assignment.getOrder();
            if (otherOrder.getDispatchDateTime() == null || otherOrder.getExpectedArrivalTime() == null) {
                continue;
            }
            if (!hasTimeOverlap(start, end, otherOrder.getDispatchDateTime(), otherOrder.getExpectedArrivalTime())) {
                continue;
            }
            if (assignment.getTransitMixer() != null && assignment.getTransitMixer().getMixerNumber() != null
                    && assignment.getTransitMixer().getMixerNumber().equalsIgnoreCase(request.getTransitMixerNumber().trim())) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "Transit mixer already allocated in this time slot",
                        "conflictOrderId", otherOrder.getOrderId()
                ));
            }
            if (assignment.getDriver() != null && assignment.getDriver().getDriverName() != null
                    && assignment.getDriver().getDriverName().equalsIgnoreCase(request.getDriverName().trim())) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "Driver already allocated in this time slot",
                        "conflictOrderId", otherOrder.getOrderId()
                ));
            }
        }

        Driver driver = upsertDriver(request.getDriverName().trim(), request.getDriverShift());
        TransitMixer mixer = upsertMixer(request.getTransitMixerNumber().trim());
        current.setDriver(driver);
        current.setTransitMixer(mixer);
        if (!isBlank(request.getBackupDriverName())) {
            current.setBackupDriver(upsertDriver(request.getBackupDriverName().trim(), request.getDriverShift()));
        }
        if (!isBlank(request.getBackupTransitMixerNumber())) {
            current.setBackupMixer(upsertMixer(request.getBackupTransitMixerNumber().trim()));
        }
        orderAssignmentRepository.save(current);

        order.setLatestNotification("Vehicle and driver assigned successfully");
        orderRepository.save(order);
        createNotification(order, "Vehicle assigned", "Vehicle and driver assigned for order " + order.getOrderId() + ".", "DELIVERY", null);

        return ResponseEntity.ok(Map.of(
                "message", "Vehicle and driver assigned successfully",
                "orderId", order.getOrderId()
        ));
    }

    @PutMapping("/orders/{orderId}/reschedule")
    public ResponseEntity<?> rescheduleOrder(
            @PathVariable String orderId,
            @RequestParam Long adminUserId,
            @RequestBody RescheduleRequest request) {

        ResponseEntity<?> adminValidation = validateAdmin(adminUserId);
        if (adminValidation != null) {
            return adminValidation;
        }

        Order order = orderRepository.findByOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (request.getProductionDate() != null) order.setProductionDate(request.getProductionDate());
        if (request.getProductionSlotStart() != null) order.setProductionSlotStart(request.getProductionSlotStart());
        if (request.getProductionSlotEnd() != null) order.setProductionSlotEnd(request.getProductionSlotEnd());
        if (request.getDispatchDateTime() != null) order.setDispatchDateTime(request.getDispatchDateTime());
        if (request.getTripPlanning() != null) order.setTripPlanning(request.getTripPlanning());
        if (request.getDeliverySequence() != null) order.setDeliverySequence(request.getDeliverySequence());
        if (request.getExpectedArrivalTime() != null) order.setExpectedArrivalTime(request.getExpectedArrivalTime());
        if (request.getRescheduleReason() != null) order.setRescheduleReason(request.getRescheduleReason());

        if (order.getProductionSlotStart() != null
                && order.getProductionSlotEnd() != null
                && !order.getProductionSlotEnd().isAfter(order.getProductionSlotStart())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Production slot end must be after start"));
        }
        if (order.getDispatchDateTime() != null
                && order.getExpectedArrivalTime() != null
                && !order.getExpectedArrivalTime().isAfter(order.getDispatchDateTime())) {
            return ResponseEntity.badRequest().body(Map.of("message", "ETA must be after dispatch time"));
        }

        OrderAssignment assignment = getOrCreateAssignment(order);
        if (request.getPlantAllocation() != null) assignment.setPlantAllocation(request.getPlantAllocation());
        if (request.getPriorityLevel() != null) assignment.setPriorityLevel(request.getPriorityLevel());
        if (request.getDriverName() != null) assignment.setDriver(upsertDriver(request.getDriverName().trim(), request.getDriverShift()));
        if (request.getTransitMixerNumber() != null) assignment.setTransitMixer(upsertMixer(request.getTransitMixerNumber().trim()));
        if (request.getBackupDriverName() != null) assignment.setBackupDriver(upsertDriver(request.getBackupDriverName().trim(), request.getDriverShift()));
        if (request.getBackupTransitMixerNumber() != null) assignment.setBackupMixer(upsertMixer(request.getBackupTransitMixerNumber().trim()));
        orderAssignmentRepository.save(assignment);

        order.setLastRescheduledAt(LocalDateTime.now());
        order.setLatestNotification("Schedule updated due to rescheduling");
        orderRepository.save(order);
        createNotification(order, "Order rescheduled", "Schedule updated for order " + order.getOrderId() + ".", "SCHEDULE", null);

        return ResponseEntity.ok(Map.of(
                "message", "Order rescheduled successfully",
                "orderId", order.getOrderId()
        ));
    }

    @GetMapping("/dispatch/availability")
    public ResponseEntity<?> getDispatchAvailability(
            @RequestParam Long adminUserId,
            @RequestParam LocalDateTime windowStart,
            @RequestParam LocalDateTime windowEnd) {

        ResponseEntity<?> adminValidation = validateAdmin(adminUserId);
        if (adminValidation != null) {
            return adminValidation;
        }

        if (!windowEnd.isAfter(windowStart)) {
            return ResponseEntity.badRequest().body(Map.of("message", "windowEnd must be after windowStart"));
        }

        Map<String, Map<String, Object>> vehicleIndex = new LinkedHashMap<>();
        for (TransitMixer mixer : transitMixerRepository.findAll()) {
            if (isBlank(mixer.getMixerNumber())) {
                continue;
            }
            vehicleIndex.put(mixer.getMixerNumber().trim().toUpperCase(), buildAvailabilityItem(mixer.getMixerNumber().trim()));
        }

        Map<String, Map<String, Object>> driverIndex = new LinkedHashMap<>();
        for (Driver driver : driverRepository.findAll()) {
            if (isBlank(driver.getDriverName())) {
                continue;
            }
            driverIndex.put(driver.getDriverName().trim().toUpperCase(), buildAvailabilityItem(driver.getDriverName().trim()));
        }

        for (OrderAssignment assignment : orderAssignmentRepository.findAll()) {
            if (assignment.getOrder() == null) {
                continue;
            }
            Order order = assignment.getOrder();
            if (order.getDispatchDateTime() == null || order.getExpectedArrivalTime() == null) {
                continue;
            }
            if (!hasTimeOverlap(windowStart, windowEnd, order.getDispatchDateTime(), order.getExpectedArrivalTime())) {
                continue;
            }

            if (assignment.getTransitMixer() != null && !isBlank(assignment.getTransitMixer().getMixerNumber())) {
                String key = assignment.getTransitMixer().getMixerNumber().trim().toUpperCase();
                Map<String, Object> row = vehicleIndex.computeIfAbsent(
                        key,
                        k -> buildAvailabilityItem(assignment.getTransitMixer().getMixerNumber().trim())
                );
                markUnavailable(row, order.getOrderId(), order.getDispatchDateTime(), order.getExpectedArrivalTime());
            }

            if (assignment.getDriver() != null && !isBlank(assignment.getDriver().getDriverName())) {
                String key = assignment.getDriver().getDriverName().trim().toUpperCase();
                Map<String, Object> row = driverIndex.computeIfAbsent(
                        key,
                        k -> buildAvailabilityItem(assignment.getDriver().getDriverName().trim())
                );
                markUnavailable(row, order.getOrderId(), order.getDispatchDateTime(), order.getExpectedArrivalTime());
            }
        }

        List<Map<String, Object>> vehicles = new ArrayList<>(vehicleIndex.values());
        List<Map<String, Object>> drivers = new ArrayList<>(driverIndex.values());
        long availableVehicleCount = vehicles.stream().filter(item -> Boolean.TRUE.equals(item.get("available"))).count();
        long availableDriverCount = drivers.stream().filter(item -> Boolean.TRUE.equals(item.get("available"))).count();

        Map<String, Object> response = new HashMap<>();
        response.put("windowStart", windowStart);
        response.put("windowEnd", windowEnd);
        response.put("vehicles", vehicles);
        response.put("drivers", drivers);
        response.put("availableVehicleCount", availableVehicleCount);
        response.put("availableDriverCount", availableDriverCount);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/dispatch/monitoring")
    public ResponseEntity<?> getDispatchMonitoring(@RequestParam Long adminUserId) {
        ResponseEntity<?> adminValidation = validateAdmin(adminUserId);
        if (adminValidation != null) {
            return adminValidation;
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        for (Order order : orderRepository.findAll()) {
            if (order.getDispatchDateTime() == null
                    && order.getDeliveryTrackingStatus() == null
                    && order.getLiveLatitude() == null
                    && order.getLiveLongitude() == null) {
                continue;
            }

            OrderAssignment assignment = orderAssignmentRepository.findByOrder_Id(order.getId()).orElse(null);
            List<Map<String, Object>> tripRows = dispatchTripRecordRepository.findByOrder_IdOrderByTripNumberAsc(order.getId())
                    .stream()
                    .map(this::toTripView)
                    .toList();

            Map<String, Object> row = new HashMap<>();
            row.put("orderId", order.getOrderId());
            row.put("dispatchStatus", resolveDeliveryStatusLabel(resolveTrackingStatus(order)));
            row.put("dispatchDateTime", order.getDispatchDateTime());
            row.put("expectedArrivalTime", order.getExpectedArrivalTime());
            row.put("vehicleId", assignment != null && assignment.getTransitMixer() != null
                    ? assignment.getTransitMixer().getMixerNumber()
                    : null);
            row.put("driverName", assignment != null && assignment.getDriver() != null
                    ? assignment.getDriver().getDriverName()
                    : null);
            row.put("plannedTrips", order.getPlannedTrips() == null ? 1 : order.getPlannedTrips());
            row.put("completedTrips", order.getCompletedTrips() == null ? 0 : order.getCompletedTrips());
            row.put("totalFuelUsedLiters", order.getTotalFuelUsedLiters() == null ? 0.0 : order.getTotalFuelUsedLiters());
            row.put("liveLatitude", order.getLiveLatitude());
            row.put("liveLongitude", order.getLiveLongitude());
            row.put("tripRecords", tripRows);
            rows.add(row);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("generatedAt", LocalDateTime.now());
        response.put("totalRecords", rows.size());
        response.put("records", rows);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/orders/{orderId}/delivery-status")
    public ResponseEntity<?> updateDeliveryStatus(
            @PathVariable String orderId,
            @RequestParam Long adminUserId,
            @RequestBody DispatchDeliveryStatusRequest request) {

        ResponseEntity<?> adminValidation = validateAdmin(adminUserId);
        if (adminValidation != null) {
            return adminValidation;
        }

        Order order = orderRepository.findByOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        DeliveryTrackingStatus deliveryStatus = parseDeliveryStatus(request.getDeliveryStatus());
        if (deliveryStatus == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Invalid delivery status. Use Scheduled, Dispatched, In Transit, or Delivered"
            ));
        }

        order.setDeliveryTrackingStatus(deliveryStatus);

        if (request.getDelayInMinutes() != null) {
            order.setDelayInMinutes(request.getDelayInMinutes());
        }
        if (!isBlank(request.getDelayUpdateMessage())) {
            order.setLatestNotification(request.getDelayUpdateMessage().trim());
        }
        if (!isBlank(request.getDeliveryConfirmationDetails())) {
            order.setDeliveryConfirmationDetails(request.getDeliveryConfirmationDetails().trim());
        }

        if (deliveryStatus == DeliveryTrackingStatus.DELIVERED) {
            order.setStatus(OrderStatus.DELIVERED);
            order.setDeliveredAt(request.getDeliveredAt() != null ? request.getDeliveredAt() : LocalDateTime.now());
            if (order.getPlannedTrips() != null && order.getPlannedTrips() > 0) {
                order.setCompletedTrips(order.getPlannedTrips());
            }
            if (isBlank(order.getLatestNotification())) {
                order.setLatestNotification("Concrete delivered successfully");
            }
        } else if (deliveryStatus == DeliveryTrackingStatus.DISPATCHED
                || deliveryStatus == DeliveryTrackingStatus.IN_TRANSIT
                || deliveryStatus == DeliveryTrackingStatus.ON_THE_WAY) {
            order.setStatus(OrderStatus.DISPATCHED);
        }

        if (isBlank(order.getLatestNotification())) {
            order.setLatestNotification("Delivery status updated to " + resolveDeliveryStatusLabel(deliveryStatus));
        }

        orderRepository.save(order);

        createNotification(
                order,
                "Delivery update",
                "Order " + order.getOrderId() + " delivery status: " + resolveDeliveryStatusLabel(deliveryStatus) + ".",
                "DELIVERY",
                null
        );

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Delivery status updated successfully");
        response.put("orderId", order.getOrderId());
        response.put("deliveryStatus", resolveDeliveryStatusLabel(deliveryStatus));
        response.put("customerDashboardUpdated", true);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/orders/{orderId}/trips")
    public ResponseEntity<?> upsertTripRecord(
            @PathVariable String orderId,
            @RequestParam Long adminUserId,
            @RequestBody TripRecordRequest request) {

        ResponseEntity<?> adminValidation = validateAdmin(adminUserId);
        if (adminValidation != null) {
            return adminValidation;
        }

        Order order = orderRepository.findByOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        if (request.getTripNumber() == null || request.getTripNumber() < 1) {
            return ResponseEntity.badRequest().body(Map.of("message", "tripNumber must be at least 1"));
        }
        if (order.getPlannedTrips() != null && order.getPlannedTrips() > 0 && request.getTripNumber() > order.getPlannedTrips()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "tripNumber cannot exceed plannedTrips",
                    "plannedTrips", order.getPlannedTrips()
            ));
        }
        if (request.getFuelUsedLiters() != null && request.getFuelUsedLiters() < 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "fuelUsedLiters cannot be negative"));
        }
        if (request.getActualDispatchTime() != null
                && request.getDeliveredTime() != null
                && request.getDeliveredTime().isBefore(request.getActualDispatchTime())) {
            return ResponseEntity.badRequest().body(Map.of("message", "deliveredTime cannot be before actualDispatchTime"));
        }

        DispatchTripStatus tripStatus = parseTripStatus(request.getStatus());
        if (tripStatus == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Invalid trip status. Use SCHEDULED, DISPATCHED, IN_TRANSIT, or DELIVERED"
            ));
        }

        DispatchTripRecord tripRecord = dispatchTripRecordRepository
                .findByOrder_IdAndTripNumber(order.getId(), request.getTripNumber())
                .orElseGet(DispatchTripRecord::new);

        tripRecord.setOrder(order);
        tripRecord.setTripNumber(request.getTripNumber());
        tripRecord.setStatus(tripStatus);
        tripRecord.setScheduledDispatchTime(request.getScheduledDispatchTime());
        tripRecord.setActualDispatchTime(request.getActualDispatchTime());
        tripRecord.setDeliveredTime(request.getDeliveredTime());
        tripRecord.setFuelUsedLiters(request.getFuelUsedLiters());
        tripRecord.setRemarks(request.getRemarks());

        OrderAssignment assignment = getOrCreateAssignment(order);
        if (!isBlank(request.getTransitMixerNumber())) {
            tripRecord.setTransitMixerNumber(request.getTransitMixerNumber().trim());
        } else if (assignment.getTransitMixer() != null && !isBlank(assignment.getTransitMixer().getMixerNumber())) {
            tripRecord.setTransitMixerNumber(assignment.getTransitMixer().getMixerNumber().trim());
        }

        if (!isBlank(request.getDriverName())) {
            tripRecord.setDriverName(request.getDriverName().trim());
        } else if (assignment.getDriver() != null && !isBlank(assignment.getDriver().getDriverName())) {
            tripRecord.setDriverName(assignment.getDriver().getDriverName().trim());
        }

        if (tripStatus == DispatchTripStatus.DELIVERED && tripRecord.getDeliveredTime() == null) {
            tripRecord.setDeliveredTime(LocalDateTime.now());
        }

        dispatchTripRecordRepository.save(tripRecord);
        refreshTripSummary(order);

        if (tripStatus == DispatchTripStatus.DISPATCHED) {
            order.setStatus(OrderStatus.DISPATCHED);
            order.setDeliveryTrackingStatus(DeliveryTrackingStatus.DISPATCHED);
            order.setLatestNotification("Trip " + request.getTripNumber() + " dispatched");
            createNotification(order, "Trip dispatched", "Trip " + request.getTripNumber() + " for order " + order.getOrderId() + " has been dispatched.", "DELIVERY", null);
        } else if (tripStatus == DispatchTripStatus.IN_TRANSIT) {
            order.setStatus(OrderStatus.DISPATCHED);
            order.setDeliveryTrackingStatus(DeliveryTrackingStatus.ON_THE_WAY);
            order.setLatestNotification("Trip " + request.getTripNumber() + " is in transit");
            createNotification(order, "Order in transit", "Trip " + request.getTripNumber() + " for order " + order.getOrderId() + " is in transit.", "DELIVERY", null);
        } else if (tripStatus == DispatchTripStatus.DELIVERED) {
            if (order.getCompletedTrips() != null && order.getPlannedTrips() != null
                    && order.getCompletedTrips() >= order.getPlannedTrips()) {
                order.setStatus(OrderStatus.DELIVERED);
                order.setDeliveryTrackingStatus(DeliveryTrackingStatus.DELIVERED);
                if (order.getDeliveredAt() == null) {
                    order.setDeliveredAt(tripRecord.getDeliveredTime() != null
                            ? tripRecord.getDeliveredTime()
                            : LocalDateTime.now());
                }
                order.setLatestNotification("All trips delivered successfully");
                createNotification(order, "Order completed", "Order " + order.getOrderId() + " has been completed and delivered.", "DELIVERY", null);
            } else {
                order.setStatus(OrderStatus.DISPATCHED);
                order.setDeliveryTrackingStatus(DeliveryTrackingStatus.ON_THE_WAY);
                order.setLatestNotification("Trip " + request.getTripNumber() + " delivered");
                createNotification(order, "Trip delivered", "Trip " + request.getTripNumber() + " for order " + order.getOrderId() + " has been delivered.", "DELIVERY", null);
            }
        } else {
            order.setDeliveryTrackingStatus(DeliveryTrackingStatus.SCHEDULED_FOR_DISPATCH);
            order.setLatestNotification("Trip " + request.getTripNumber() + " scheduled");
            createNotification(order, "Trip scheduled", "Trip " + request.getTripNumber() + " for order " + order.getOrderId() + " has been scheduled.", "DELIVERY", null);
        }

        orderRepository.save(order);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Trip record saved successfully");
        response.put("orderId", order.getOrderId());
        response.put("trip", toTripView(tripRecord));
        response.put("plannedTrips", order.getPlannedTrips() == null ? 1 : order.getPlannedTrips());
        response.put("completedTrips", order.getCompletedTrips() == null ? 0 : order.getCompletedTrips());
        response.put("totalFuelUsedLiters", order.getTotalFuelUsedLiters() == null ? 0.0 : order.getTotalFuelUsedLiters());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/orders/{orderId}/trips")
    public ResponseEntity<?> getTripRecords(
            @PathVariable String orderId,
            @RequestParam Long adminUserId) {

        ResponseEntity<?> adminValidation = validateAdmin(adminUserId);
        if (adminValidation != null) {
            return adminValidation;
        }

        Order order = orderRepository.findByOrderId(orderId).orElse(null);
        if (order == null) {
            return ResponseEntity.status(404).body(Map.of("message", "Order not found"));
        }

        List<Map<String, Object>> tripViews = dispatchTripRecordRepository
                .findByOrder_IdOrderByTripNumberAsc(order.getId())
                .stream()
                .map(this::toTripView)
                .toList();

        Map<String, Object> response = new HashMap<>();
        response.put("orderId", order.getOrderId());
        response.put("plannedTrips", order.getPlannedTrips() == null ? 1 : order.getPlannedTrips());
        response.put("completedTrips", order.getCompletedTrips() == null ? 0 : order.getCompletedTrips());
        response.put("totalFuelUsedLiters", order.getTotalFuelUsedLiters() == null ? 0.0 : order.getTotalFuelUsedLiters());
        response.put("trips", tripViews);
        return ResponseEntity.ok(response);
    }

    private ResponseEntity<?> validateAdmin(Long adminUserId) {
        if (adminUserId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "adminUserId is required"));
        }

        User adminUser = userRepository.findById(adminUserId).orElse(null);
        if (adminUser == null) {
            return ResponseEntity.status(404).body(Map.of("message", "Admin user not found"));
        }
        if (!"ADMIN".equalsIgnoreCase(adminUser.getRole())) {
            return ResponseEntity.status(403).body(Map.of("message", "Only admin can perform this action"));
        }
        if (adminUser.getApprovalStatus() != null
                && !adminUser.getApprovalStatus().isBlank()
                && !"APPROVED".equalsIgnoreCase(adminUser.getApprovalStatus())) {
            return ResponseEntity.status(403).body(Map.of("message", "Admin account is not approved"));
        }
        return null;
    }

    private Map<String, Object> buildAvailabilityItem(String id) {
        Map<String, Object> row = new HashMap<>();
        row.put("id", id);
        row.put("available", true);
        row.put("assignedOrderId", null);
        row.put("busyFrom", null);
        row.put("busyTo", null);
        return row;
    }

    private void markUnavailable(Map<String, Object> row, String orderId, LocalDateTime busyFrom, LocalDateTime busyTo) {
        row.put("available", false);
        row.put("assignedOrderId", orderId);
        row.put("busyFrom", busyFrom);
        row.put("busyTo", busyTo);
    }

    private DispatchTripStatus parseTripStatus(String rawStatus) {
        if (isBlank(rawStatus)) {
            return DispatchTripStatus.SCHEDULED;
        }

        String normalized = rawStatus.trim().toUpperCase().replace(' ', '_');
        switch (normalized) {
            case "SCHEDULED":
                return DispatchTripStatus.SCHEDULED;
            case "DISPATCHED":
                return DispatchTripStatus.DISPATCHED;
            case "IN_TRANSIT":
            case "ON_THE_WAY":
                return DispatchTripStatus.IN_TRANSIT;
            case "DELIVERED":
                return DispatchTripStatus.DELIVERED;
            default:
                return null;
        }
    }

    private DeliveryTrackingStatus parseDeliveryStatus(String rawStatus) {
        if (isBlank(rawStatus)) {
            return null;
        }

        String normalized = rawStatus.trim().toUpperCase().replace(' ', '_');
        switch (normalized) {
            case "SCHEDULED":
            case "SCHEDULED_FOR_DISPATCH":
                return DeliveryTrackingStatus.SCHEDULED_FOR_DISPATCH;
            case "DISPATCHED":
                return DeliveryTrackingStatus.DISPATCHED;
            case "IN_TRANSIT":
            case "ON_THE_WAY":
                return DeliveryTrackingStatus.ON_THE_WAY;
            case "DELIVERED":
                return DeliveryTrackingStatus.DELIVERED;
            default:
                return null;
        }
    }

    private DeliveryTrackingStatus resolveTrackingStatus(Order order) {
        if (order.getDeliveryTrackingStatus() != null) {
            if (order.getDeliveryTrackingStatus() == DeliveryTrackingStatus.ON_THE_WAY) {
                return DeliveryTrackingStatus.IN_TRANSIT;
            }
            return order.getDeliveryTrackingStatus();
        }
        if (order.getStatus() == OrderStatus.DELIVERED) {
            return DeliveryTrackingStatus.DELIVERED;
        }
        if (order.getStatus() == OrderStatus.DISPATCHED) {
            return DeliveryTrackingStatus.DISPATCHED;
        }
        if (order.getDispatchDateTime() != null) {
            return DeliveryTrackingStatus.SCHEDULED_FOR_DISPATCH;
        }
        return null;
    }

    private String resolveDeliveryStatusLabel(DeliveryTrackingStatus status) {
        if (status == null) {
            return null;
        }
        switch (status) {
            case SCHEDULED_FOR_DISPATCH:
                return "SCHEDULED";
            case DISPATCHED:
                return "DISPATCHED";
            case IN_TRANSIT:
            case ON_THE_WAY:
                return "IN_TRANSIT";
            case DELIVERED:
                return "DELIVERED";
            default:
                return status.name();
        }
    }

    private void refreshTripSummary(Order order) {
        if (order.getId() == null) {
            return;
        }

        List<DispatchTripRecord> records = dispatchTripRecordRepository.findByOrder_IdOrderByTripNumberAsc(order.getId());
        int completedTrips = 0;
        double fuel = 0.0;
        int maxTripNumber = 0;
        LocalDateTime latestDeliveredAt = null;

        for (DispatchTripRecord record : records) {
            if (record.getTripNumber() != null && record.getTripNumber() > maxTripNumber) {
                maxTripNumber = record.getTripNumber();
            }

            if (record.getStatus() == DispatchTripStatus.DELIVERED) {
                completedTrips++;
                if (record.getDeliveredTime() != null
                        && (latestDeliveredAt == null || record.getDeliveredTime().isAfter(latestDeliveredAt))) {
                    latestDeliveredAt = record.getDeliveredTime();
                }
            }
            if (record.getFuelUsedLiters() != null) {
                fuel += record.getFuelUsedLiters();
            }
        }

        if (order.getPlannedTrips() == null) {
            order.setPlannedTrips(maxTripNumber > 0 ? maxTripNumber : 1);
        }
        order.setCompletedTrips(completedTrips);
        order.setTotalFuelUsedLiters(fuel);
        if (latestDeliveredAt != null) {
            order.setDeliveredAt(latestDeliveredAt);
        }
    }

    private Map<String, Object> toTripView(DispatchTripRecord trip) {
        Map<String, Object> row = new HashMap<>();
        row.put("id", trip.getId());
        row.put("tripNumber", trip.getTripNumber());
        row.put("status", trip.getStatus());
        row.put("scheduledDispatchTime", trip.getScheduledDispatchTime());
        row.put("actualDispatchTime", trip.getActualDispatchTime());
        row.put("deliveredTime", trip.getDeliveredTime());
        row.put("fuelUsedLiters", trip.getFuelUsedLiters());
        row.put("remarks", trip.getRemarks());
        row.put("transitMixerNumber", trip.getTransitMixerNumber());
        row.put("driverName", trip.getDriverName());
        return row;
    }

    private boolean hasTimeOverlap(LocalDateTime startA, LocalDateTime endA, LocalDateTime startB, LocalDateTime endB) {
        return startA.isBefore(endB) && endA.isAfter(startB);
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private void createNotification(Order order, String title, String message, String type, String reminderKey) {
        if (order == null || order.getUser() == null) {
            return;
        }

        try {
            CustomerNotification notification = new CustomerNotification();
            notification.setUser(order.getUser());
            notification.setOrderId(order.getOrderId());
            notification.setTitle(title);
            notification.setMessage(message);
            notification.setType(type);
            notification.setCreatedAt(LocalDateTime.now());
            notification.setRead(false);
            notification.setDeleted(false);
            notification.setReminderKey(reminderKey);
            customerNotificationRepository.save(notification);
        } catch (Exception ex) {
            logger.error("Failed to create customer notification for order {}", order.getOrderId(), ex);
        }
    }

    private OrderAssignment getOrCreateAssignment(Order order) {
        if (order.getId() == null) {
            throw new RuntimeException("Order must exist before assignment");
        }
        return orderAssignmentRepository.findByOrder_Id(order.getId())
                .orElseGet(() -> {
                    OrderAssignment assignment = new OrderAssignment();
                    assignment.setOrder(order);
                    return assignment;
                });
    }

    private Driver upsertDriver(String driverName, String driverShift) {
        Driver driver = driverRepository.findByDriverNameIgnoreCase(driverName)
                .orElseGet(() -> {
                    Driver item = new Driver();
                    item.setDriverName(driverName);
                    item.setDriverShift(driverShift);
                    return driverRepository.save(item);
                });
        if (!isBlank(driverShift)) {
            driver.setDriverShift(driverShift);
            driver = driverRepository.save(driver);
        }
        return driver;
    }

    private TransitMixer upsertMixer(String mixerNumber) {
        return transitMixerRepository.findByMixerNumber(mixerNumber)
                .orElseGet(() -> {
                    TransitMixer mixer = new TransitMixer();
                    mixer.setMixerNumber(mixerNumber);
                    return transitMixerRepository.save(mixer);
                });
    }

    private Map<String, Object> toOrderView(Order order) {
        refreshTripSummary(order);

        Map<String, Object> row = new HashMap<>();
        row.put("id", order.getId());
        row.put("orderId", order.getOrderId());
        row.put("grade", order.getGrade());
        row.put("quantity", order.getQuantity());
        row.put("totalPrice", order.getTotalPrice());
        row.put("address", order.getAddress());
        row.put("status", order.getStatus());
        row.put("paymentOption", order.getPaymentOption());
        row.put("creditDays", order.getCreditDays());
        row.put("creditApprovalStatus", order.getCreditApprovalStatus());
        row.put("creditRequestedAt", order.getCreditRequestedAt());
        row.put("creditReviewedAt", order.getCreditReviewedAt());
        row.put("creditDueDate", order.getCreditDueDate());
        row.put("creditReviewRemark", order.getCreditReviewRemark());
        row.put("deliveryDate", order.getDeliveryDate());
        row.put("scheduledDate", order.getScheduledDate());
        row.put("approvedAt", order.getApprovedAt());
        row.put("productionDate", order.getProductionDate());
        row.put("productionSlotStart", order.getProductionSlotStart());
        row.put("productionSlotEnd", order.getProductionSlotEnd());
        row.put("dispatchDateTime", order.getDispatchDateTime());
        row.put("expectedArrivalTime", order.getExpectedArrivalTime());
        row.put("deliverySequence", order.getDeliverySequence());
        row.put("tripPlanning", order.getTripPlanning());
        row.put("plannedTrips", order.getPlannedTrips() == null ? 1 : order.getPlannedTrips());
        row.put("completedTrips", order.getCompletedTrips() == null ? 0 : order.getCompletedTrips());
        row.put("totalFuelUsedLiters", order.getTotalFuelUsedLiters() == null ? 0.0 : order.getTotalFuelUsedLiters());
        row.put("latestNotification", order.getLatestNotification());
        row.put("deliveryTrackingStatus", resolveTrackingStatus(order));
        row.put("deliveryTrackingStatusLabel", resolveDeliveryStatusLabel(resolveTrackingStatus(order)));
        row.put("delayInMinutes", order.getDelayInMinutes());
        row.put("liveLatitude", order.getLiveLatitude());
        row.put("liveLongitude", order.getLiveLongitude());
        row.put("deliveredAt", order.getDeliveredAt());
        row.put("deliveryConfirmationDetails", order.getDeliveryConfirmationDetails());
        row.put("userId", order.getUser() != null ? order.getUser().getId() : null);
        row.put("customerName", order.getUser() != null ? order.getUser().getName() : null);
        row.put("customerEmail", order.getUser() != null ? order.getUser().getEmail() : null);
        row.put("customerPhone", order.getUser() != null ? order.getUser().getNumber() : null);

        OrderAssignment assignment = orderAssignmentRepository.findByOrder_Id(order.getId()).orElse(null);
        if (assignment != null) {
            row.put("plantAllocation", assignment.getPlantAllocation());
            row.put("priorityLevel", assignment.getPriorityLevel());
            row.put("transitMixerNumber",
                    assignment.getTransitMixer() != null ? assignment.getTransitMixer().getMixerNumber() : null);
            row.put("driverName",
                    assignment.getDriver() != null ? assignment.getDriver().getDriverName() : null);
            row.put("driverShift",
                    assignment.getDriver() != null ? assignment.getDriver().getDriverShift() : null);
            row.put("backupTransitMixerNumber",
                    assignment.getBackupMixer() != null ? assignment.getBackupMixer().getMixerNumber() : null);
            row.put("backupDriverName",
                    assignment.getBackupDriver() != null ? assignment.getBackupDriver().getDriverName() : null);
        } else {
            row.put("plantAllocation", null);
            row.put("priorityLevel", null);
            row.put("transitMixerNumber", null);
            row.put("driverName", null);
            row.put("driverShift", null);
            row.put("backupTransitMixerNumber", null);
            row.put("backupDriverName", null);
        }

        List<Map<String, Object>> trips = dispatchTripRecordRepository.findByOrder_IdOrderByTripNumberAsc(order.getId())
                .stream()
                .map(this::toTripView)
                .toList();
        row.put("tripRecords", trips);

        return row;
    }

}
