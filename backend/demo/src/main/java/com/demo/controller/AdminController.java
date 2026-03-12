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
import com.demo.entity.NotificationType;
import com.demo.entity.Order;
import com.demo.entity.OrderAssignment;
import com.demo.entity.OrderStatus;
import com.demo.entity.PaymentRecord;
import com.demo.entity.TransitMixer;
import com.demo.entity.User;
import com.demo.repository.DispatchTripRecordRepository;
import com.demo.repository.DriverRepository;
import com.demo.repository.OrderAssignmentRepository;
import com.demo.repository.OrderRepository;
import com.demo.repository.PaymentRecordRepository;
import com.demo.repository.QualityInspectionRepository;
import com.demo.repository.TransitMixerRepository;
import com.demo.repository.UserRepository;
import com.demo.service.OrderNotificationService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin("*")
public class AdminController {

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
    private OrderNotificationService orderNotificationService;


    // ? 1. Get All Orders
    @GetMapping("/orders")
    public List<Map<String, Object>> getAllOrders() {
        List<Map<String, Object>> response = new ArrayList<>();
        for (Order order : orderRepository.findAll()) {
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
            if (newStatus == OrderStatus.DELIVERED) {
                order.setDeliveryTrackingStatus(DeliveryTrackingStatus.DELIVERED);
                if (order.getDeliveredAt() == null) {
                    order.setDeliveredAt(LocalDateTime.now());
                }
                order.setReturnReason(null);
                order.setReturnedQuantity(null);
            } else if (newStatus == OrderStatus.RETURNED) {
                order.setDeliveryTrackingStatus(DeliveryTrackingStatus.RETURNED);
                if (order.getReturnedQuantity() == null || order.getReturnedQuantity() <= 0) {
                    order.setReturnedQuantity(order.getQuantity());
                }
                if (isBlank(order.getReturnReason())) {
                    order.setReturnReason("Returned by admin");
                }
            } else if (newStatus == OrderStatus.DISPATCHED) {
                order.setDeliveryTrackingStatus(DeliveryTrackingStatus.DISPATCHED);
            } else {
                // Non-dispatch statuses should not keep stale delivery tracking stage.
                order.setDeliveryTrackingStatus(null);
                order.setDeliveredAt(null);
                order.setReturnReason(null);
                order.setReturnedQuantity(null);
            }
            String stage = newStatus.name().replace('_', ' ');
            order.setLatestNotification("Order status updated to " + stage);
            orderRepository.save(order);
            orderNotificationService.logOrderUpdate(order, resolveTrackingStatus(order), order.getLatestNotification());

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

    @PutMapping("/orders/{orderId}/workflow-step")
    public ResponseEntity<?> quickUpdateWorkflowStep(
            @PathVariable String orderId,
            @RequestParam Long adminUserId,
            @RequestBody(required = false) Map<String, Object> payload) {

        ResponseEntity<?> adminValidation = validateAdmin(adminUserId);
        if (adminValidation != null) {
            return adminValidation;
        }

        Order order = orderRepository.findByOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        String rawStep = payload == null ? null : String.valueOf(payload.getOrDefault("step", "")).trim();
        if (rawStep == null || rawStep.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "step is required (IN_PRODUCTION, SCHEDULED, DISPATCHED, IN_TRANSIT, DELIVERED)"
            ));
        }

        String step = rawStep.toUpperCase().replace("-", "_").replace(" ", "_");
        LocalDateTime now = LocalDateTime.now();

        switch (step) {
            case "APPROVED":
                order.setStatus(OrderStatus.APPROVED);
                order.setDeliveryTrackingStatus(null);
                order.setDeliveredAt(null);
                order.setReturnReason(null);
                order.setReturnedQuantity(null);
                order.setLatestNotification("Order approved and ready for production");
                break;
            case "IN_PRODUCTION":
            case "PRODUCTION":
                if (order.getStatus() == OrderStatus.PENDING_APPROVAL || order.getStatus() == OrderStatus.REJECTED) {
                    order.setStatus(OrderStatus.APPROVED);
                }
                order.setStatus(OrderStatus.IN_PRODUCTION);
                order.setDeliveryTrackingStatus(null);
                order.setDeliveredAt(null);
                order.setReturnReason(null);
                order.setReturnedQuantity(null);
                if (order.getProductionDate() == null) {
                    order.setProductionDate(now.toLocalDate());
                }
                if (order.getProductionSlotStart() == null) {
                    order.setProductionSlotStart(now);
                }
                if (order.getProductionSlotEnd() == null || !order.getProductionSlotEnd().isAfter(order.getProductionSlotStart())) {
                    order.setProductionSlotEnd(order.getProductionSlotStart().plusHours(2));
                }
                order.setLatestNotification("Order moved to production");
                break;
            case "SCHEDULED":
                if (order.getStatus() == OrderStatus.PENDING_APPROVAL
                        || order.getStatus() == OrderStatus.REJECTED
                        || order.getStatus() == OrderStatus.DISPATCHED
                        || order.getStatus() == OrderStatus.DELIVERED) {
                    order.setStatus(OrderStatus.APPROVED);
                }
                order.setDeliveryTrackingStatus(DeliveryTrackingStatus.SCHEDULED_FOR_DISPATCH);
                order.setDeliveredAt(null);
                order.setReturnReason(null);
                order.setReturnedQuantity(null);
                if (order.getDispatchDateTime() == null) {
                    order.setDispatchDateTime(now.plusHours(2));
                }
                if (order.getExpectedArrivalTime() == null || !order.getExpectedArrivalTime().isAfter(order.getDispatchDateTime())) {
                    order.setExpectedArrivalTime(order.getDispatchDateTime().plusHours(2));
                }
                if (isBlank(order.getTripPlanning())) {
                    order.setTripPlanning("SINGLE_TRIP");
                }
                if (order.getPlannedTrips() == null || order.getPlannedTrips() < 1) {
                    order.setPlannedTrips(1);
                }
                if (order.getCompletedTrips() == null) {
                    order.setCompletedTrips(0);
                }
                order.setLatestNotification("Order scheduled for dispatch");
                break;
            case "DISPATCHED":
                if (order.getDispatchDateTime() == null) {
                    order.setDispatchDateTime(now);
                }
                if (order.getExpectedArrivalTime() == null || !order.getExpectedArrivalTime().isAfter(order.getDispatchDateTime())) {
                    order.setExpectedArrivalTime(order.getDispatchDateTime().plusHours(2));
                }
                order.setStatus(OrderStatus.DISPATCHED);
                order.setDeliveryTrackingStatus(DeliveryTrackingStatus.DISPATCHED);
                order.setDeliveredAt(null);
                order.setReturnReason(null);
                order.setReturnedQuantity(null);
                order.setLatestNotification("Order dispatched from plant");
                break;
            case "IN_TRANSIT":
            case "ON_THE_WAY":
                if (order.getDispatchDateTime() == null) {
                    order.setDispatchDateTime(now.minusMinutes(15));
                }
                if (order.getExpectedArrivalTime() == null || !order.getExpectedArrivalTime().isAfter(order.getDispatchDateTime())) {
                    order.setExpectedArrivalTime(now.plusHours(1));
                }
                order.setStatus(OrderStatus.DISPATCHED);
                order.setDeliveryTrackingStatus(DeliveryTrackingStatus.IN_TRANSIT);
                order.setDeliveredAt(null);
                order.setReturnReason(null);
                order.setReturnedQuantity(null);
                order.setLatestNotification("Order is in transit");
                break;
            case "DELIVERED":
                order.setStatus(OrderStatus.DELIVERED);
                order.setDeliveryTrackingStatus(DeliveryTrackingStatus.DELIVERED);
                if (order.getDeliveredAt() == null) {
                    order.setDeliveredAt(now);
                }
                order.setReturnReason(null);
                order.setReturnedQuantity(null);
                if (order.getPlannedTrips() != null && order.getPlannedTrips() > 0) {
                    order.setCompletedTrips(order.getPlannedTrips());
                }
                order.setLatestNotification("Order delivered successfully");
                break;
            case "RETURNED":
                order.setStatus(OrderStatus.RETURNED);
                order.setDeliveryTrackingStatus(DeliveryTrackingStatus.RETURNED);
                if (payload != null && payload.get("returnedQuantity") != null) {
                    order.setReturnedQuantity(parsePositiveDouble(payload.get("returnedQuantity"), order.getQuantity()));
                } else if (order.getReturnedQuantity() == null || order.getReturnedQuantity() <= 0) {
                    order.setReturnedQuantity(order.getQuantity());
                }
                if (payload != null && payload.get("returnReason") != null) {
                    String reason = String.valueOf(payload.get("returnReason")).trim();
                    order.setReturnReason(reason.isEmpty() ? "Returned by admin" : reason);
                } else if (isBlank(order.getReturnReason())) {
                    order.setReturnReason("Returned by admin");
                }
                order.setLatestNotification("Delivery returned: " + order.getReturnReason());
                break;
            default:
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "Invalid step. Use IN_PRODUCTION, SCHEDULED, DISPATCHED, IN_TRANSIT, DELIVERED, or RETURNED"
                ));
        }

        orderRepository.save(order);
        orderNotificationService.logOrderUpdate(order, resolveTrackingStatus(order), order.getLatestNotification());

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Workflow updated to " + step);
        response.put("orderId", order.getOrderId());
        response.put("status", order.getStatus());
        response.put("deliveryTrackingStatus", resolveTrackingStatus(order));
        response.put("deliveryTrackingStatusLabel", resolveDeliveryStatusLabel(resolveTrackingStatus(order)));
        response.put("latestNotification", order.getLatestNotification());
        response.put("customerDashboardUpdated", true);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/orders/{orderId}/dispatch/calculate-trips")
    public ResponseEntity<?> calculateDispatchTrips(
            @PathVariable String orderId,
            @RequestParam Long adminUserId,
            @RequestParam(required = false) Double capacityM3) {

        ResponseEntity<?> adminValidation = validateAdmin(adminUserId);
        if (adminValidation != null) {
            return adminValidation;
        }

        Order order = orderRepository.findByOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        double effectiveCapacity = resolveTruckCapacity(order, capacityM3);
        if (effectiveCapacity <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Truck capacity must be greater than 0"));
        }

        List<Double> tripLoads = calculateTripLoads(order.getQuantity(), effectiveCapacity);
        List<Map<String, Object>> plan = new ArrayList<>();
        for (int i = 0; i < tripLoads.size(); i++) {
            Map<String, Object> row = new HashMap<>();
            row.put("tripNumber", i + 1);
            row.put("quantityM3", tripLoads.get(i));
            plan.add(row);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("orderId", order.getOrderId());
        response.put("orderQuantityM3", order.getQuantity());
        response.put("capacityM3", effectiveCapacity);
        response.put("requiredTrips", tripLoads.size());
        response.put("tripPlan", plan);
        return ResponseEntity.ok(response);
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
        order.setDeliveryTrackingStatus(null);
        order.setDeliveredAt(null);
        order.setReturnReason(null);
        order.setReturnedQuantity(null);
        order.setLatestNotification("Order approved");

        orderRepository.save(order);
        orderNotificationService.createNotification(order, NotificationType.ORDER_APPROVED);

        return ResponseEntity.ok("Order Approved");
    }
    @PutMapping("/orders/{orderId}/reject")
    public ResponseEntity<?> rejectOrder(@PathVariable String orderId) {

        Order order = orderRepository.findByOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        order.setStatus(OrderStatus.REJECTED);
        order.setDeliveryTrackingStatus(null);
        order.setDeliveredAt(null);
        order.setReturnReason(null);
        order.setReturnedQuantity(null);
        order.setLatestNotification("Order rejected");
        orderRepository.save(order);
        orderNotificationService.logOrderUpdate(order, resolveTrackingStatus(order), order.getLatestNotification());

        return ResponseEntity.ok("Order Rejected");
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
        order.setDeliveryTrackingStatus(null);
        order.setDeliveredAt(null);
        order.setReturnReason(null);
        order.setReturnedQuantity(null);
        order.setLatestNotification("Production schedule updated by admin");

        OrderAssignment assignment = getOrCreateAssignment(order);
        assignment.setPlantAllocation(request.getPlantAllocation());
        assignment.setPriorityLevel(request.getPriorityLevel());
        orderAssignmentRepository.save(assignment);
        orderRepository.save(order);
        orderNotificationService.createNotification(order, NotificationType.IN_PRODUCTION);

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

        OrderAssignment assignment = orderAssignmentRepository.findByOrder_Id(order.getId()).orElse(null);
        if (assignment == null || assignment.getTransitMixer() == null || assignment.getDriver() == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Assign transit mixer and driver before dispatch scheduling"
            ));
        }
        String mixerNumber = assignment.getTransitMixer().getMixerNumber();
        String driverName = assignment.getDriver().getDriverName();
        if (isBlank(mixerNumber) || isBlank(driverName)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Assign transit mixer and driver before dispatch scheduling"
            ));
        }

        LocalDateTime requestedDispatchTime = request.getDispatchDateTime();
        LocalDateTime requestedEta = request.getExpectedArrivalTime();
        for (OrderAssignment otherAssignment : orderAssignmentRepository.findAll()) {
            if (otherAssignment.getOrder() == null || Objects.equals(otherAssignment.getOrder().getId(), order.getId())) {
                continue;
            }
            Order otherOrder = otherAssignment.getOrder();
            if (otherOrder.getDispatchDateTime() == null || otherOrder.getExpectedArrivalTime() == null) {
                continue;
            }
            if (!hasTimeOverlap(requestedDispatchTime, requestedEta, otherOrder.getDispatchDateTime(), otherOrder.getExpectedArrivalTime())) {
                continue;
            }

            boolean sameMixer = otherAssignment.getTransitMixer() != null
                    && !isBlank(otherAssignment.getTransitMixer().getMixerNumber())
                    && otherAssignment.getTransitMixer().getMixerNumber().trim().equalsIgnoreCase(mixerNumber.trim());
            if (sameMixer) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "Transit mixer already allocated in this dispatch window",
                        "conflictOrderId", otherOrder.getOrderId()
                ));
            }

            boolean sameDriver = otherAssignment.getDriver() != null
                    && !isBlank(otherAssignment.getDriver().getDriverName())
                    && otherAssignment.getDriver().getDriverName().trim().equalsIgnoreCase(driverName.trim());
            if (sameDriver) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "Driver already allocated in this dispatch window",
                        "conflictOrderId", otherOrder.getOrderId()
                ));
            }
        }

        double capacityM3 = resolveTruckCapacity(order, request.getTruckCapacityM3());
        if (capacityM3 <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Truck capacity must be greater than 0"));
        }

        List<Double> tripLoads = calculateTripLoads(order.getQuantity(), capacityM3);
        int plannedTrips = tripLoads.size();
        String tripPlanning = plannedTrips > 1 ? "MULTIPLE_TRIPS" : "SINGLE_TRIP";

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
        // Dispatch action should move the order to DISPATCHED so admin/customer dashboards stay in sync.
        order.setStatus(OrderStatus.DISPATCHED);
        order.setDeliveryTrackingStatus(DeliveryTrackingStatus.DISPATCHED);
        order.setDeliveredAt(null);
        order.setReturnReason(null);
        order.setReturnedQuantity(null);
        order.setLatestNotification("Order dispatched from plant");
        orderRepository.save(order);

        mixerNumber = assignment.getTransitMixer() != null ? assignment.getTransitMixer().getMixerNumber() : null;
        driverName = assignment.getDriver() != null ? assignment.getDriver().getDriverName() : null;
        int intervalMinutes = request.getDispatchIntervalMinutes() != null && request.getDispatchIntervalMinutes() > 0
                ? request.getDispatchIntervalMinutes()
                : 60;
        int travelMinutes = request.getEstimatedTravelMinutes() != null && request.getEstimatedTravelMinutes() > 0
                ? request.getEstimatedTravelMinutes()
                : 90;

        List<DispatchTripRecord> existingTrips = dispatchTripRecordRepository.findByOrder_IdOrderByTripNumberAsc(order.getId());
        Map<Integer, DispatchTripRecord> existingByTrip = new HashMap<>();
        for (DispatchTripRecord trip : existingTrips) {
            if (trip.getTripNumber() != null) {
                existingByTrip.put(trip.getTripNumber(), trip);
            }
        }

        for (int i = 0; i < plannedTrips; i++) {
            int tripNumber = i + 1;
            DispatchTripRecord trip = existingByTrip.getOrDefault(tripNumber, new DispatchTripRecord());
            LocalDateTime dispatchTime = request.getDispatchDateTime().plusMinutes((long) intervalMinutes * i);
            LocalDateTime eta = dispatchTime.plusMinutes(travelMinutes);

            trip.setOrder(order);
            trip.setTripNumber(tripNumber);
            trip.setStatus(DispatchTripStatus.SCHEDULED);
            trip.setTripQuantityM3(tripLoads.get(i));
            trip.setShift(resolveShiftByDispatchTime(dispatchTime));
            trip.setScheduledDispatchTime(dispatchTime);
            trip.setEstimatedDeliveryTime(eta);
            if (!isBlank(mixerNumber)) {
                trip.setTransitMixerNumber(mixerNumber);
            }
            if (!isBlank(driverName)) {
                trip.setDriverName(driverName);
            }
            dispatchTripRecordRepository.save(trip);
        }

        for (DispatchTripRecord trip : existingTrips) {
            if (trip.getTripNumber() != null && trip.getTripNumber() > plannedTrips) {
                dispatchTripRecordRepository.delete(trip);
            }
        }

        orderNotificationService.createNotification(order, NotificationType.DISPATCH_SCHEDULED);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Dispatch scheduled successfully");
        response.put("orderId", order.getOrderId());
        response.put("tripPlanning", order.getTripPlanning());
        response.put("plannedTrips", order.getPlannedTrips());
        response.put("capacityM3", capacityM3);
        response.put("tripLoads", tripLoads);
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

        OrderAssignment current = getOrCreateAssignment(order);
        LocalDateTime start = order.getDispatchDateTime();
        LocalDateTime end = order.getExpectedArrivalTime();
        boolean hasDispatchWindow = start != null && end != null;

        for (OrderAssignment assignment : orderAssignmentRepository.findAll()) {
            if (assignment.getOrder() == null || Objects.equals(assignment.getOrder().getId(), order.getId())) {
                continue;
            }
            if (!hasDispatchWindow) {
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
        if (request.getTransitMixerCapacityM3() != null && request.getTransitMixerCapacityM3() > 0) {
            mixer.setCapacityM3(request.getTransitMixerCapacityM3());
            mixer = transitMixerRepository.save(mixer);
        }
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
        orderNotificationService.createNotification(order, NotificationType.VEHICLE_ASSIGNED);

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
                    "message", "Invalid delivery status. Use Scheduled, Dispatched, In Transit, Delivered, or Returned"
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
            order.setReturnReason(null);
            order.setReturnedQuantity(null);
            if (isBlank(order.getLatestNotification())) {
                order.setLatestNotification("Concrete delivered successfully");
            }
        } else if (deliveryStatus == DeliveryTrackingStatus.RETURNED) {
            order.setStatus(OrderStatus.RETURNED);
            order.setDeliveredAt(null);
            order.setReturnReason(isBlank(request.getReturnReason()) ? "Returned from site" : request.getReturnReason().trim());
            order.setReturnedQuantity(request.getReturnedQuantity() != null && request.getReturnedQuantity() > 0
                    ? request.getReturnedQuantity()
                    : order.getQuantity());
            if (isBlank(order.getLatestNotification())) {
                order.setLatestNotification("Delivery returned: " + order.getReturnReason());
            }
        } else if (deliveryStatus == DeliveryTrackingStatus.DISPATCHED
                || deliveryStatus == DeliveryTrackingStatus.IN_TRANSIT
                || deliveryStatus == DeliveryTrackingStatus.ON_THE_WAY) {
            order.setStatus(OrderStatus.DISPATCHED);
            order.setReturnReason(null);
            order.setReturnedQuantity(null);
        }

        if (isBlank(order.getLatestNotification())) {
            order.setLatestNotification("Delivery status updated to " + resolveDeliveryStatusLabel(deliveryStatus));
        }

        orderRepository.save(order);
        if (deliveryStatus == DeliveryTrackingStatus.DELIVERED) {
            orderNotificationService.createNotification(order, NotificationType.ORDER_DELIVERED);
        } else if (deliveryStatus == DeliveryTrackingStatus.RETURNED) {
            orderNotificationService.createNotification(order, NotificationType.ORDER_RETURNED);
        } else {
            orderNotificationService.createNotification(order, NotificationType.DELIVERY_STATUS_UPDATED);
        }

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
                    "message", "Invalid trip status. Use SCHEDULED, DISPATCHED, IN_TRANSIT, DELIVERED, or RETURNED"
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
        tripRecord.setEstimatedDeliveryTime(request.getEstimatedDeliveryTime());
        tripRecord.setShift(request.getShift());
        tripRecord.setTripQuantityM3(request.getTripQuantityM3());
        if (isBlank(tripRecord.getShift())) {
            tripRecord.setShift(resolveShiftByDispatchTime(tripRecord.getScheduledDispatchTime()));
        }
        if (tripRecord.getTripQuantityM3() == null || tripRecord.getTripQuantityM3() <= 0) {
            if (order.getPlannedTrips() != null && order.getPlannedTrips() > 0) {
                double perTrip = Math.round((order.getQuantity() / order.getPlannedTrips()) * 100.0) / 100.0;
                tripRecord.setTripQuantityM3(perTrip);
            } else {
                tripRecord.setTripQuantityM3(order.getQuantity());
            }
        }
        tripRecord.setFuelUsedLiters(request.getFuelUsedLiters());
        tripRecord.setRemarks(request.getRemarks());
        tripRecord.setReturnReason(request.getReturnReason());
        tripRecord.setReturnedQuantity(request.getReturnedQuantity());

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
        if (tripStatus == DispatchTripStatus.DELIVERED) {
            tripRecord.setReturnReason(null);
            tripRecord.setReturnedQuantity(null);
        }
        if (tripStatus == DispatchTripStatus.RETURNED) {
            tripRecord.setReturnReason(isBlank(request.getReturnReason()) ? "Returned from site" : request.getReturnReason().trim());
            tripRecord.setReturnedQuantity(request.getReturnedQuantity() != null && request.getReturnedQuantity() > 0
                    ? request.getReturnedQuantity()
                    : (tripRecord.getTripQuantityM3() != null && tripRecord.getTripQuantityM3() > 0
                        ? tripRecord.getTripQuantityM3()
                        : order.getQuantity()));
            tripRecord.setDeliveredTime(null);
        }

        dispatchTripRecordRepository.save(tripRecord);
        refreshTripSummary(order);

        if (tripStatus == DispatchTripStatus.DISPATCHED) {
            order.setStatus(OrderStatus.DISPATCHED);
            order.setDeliveryTrackingStatus(DeliveryTrackingStatus.DISPATCHED);
            order.setLatestNotification("Trip " + request.getTripNumber() + " dispatched");
        } else if (tripStatus == DispatchTripStatus.IN_TRANSIT) {
            order.setStatus(OrderStatus.DISPATCHED);
            order.setDeliveryTrackingStatus(DeliveryTrackingStatus.ON_THE_WAY);
            order.setLatestNotification("Trip " + request.getTripNumber() + " is in transit");
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
            } else {
                order.setStatus(OrderStatus.DISPATCHED);
                order.setDeliveryTrackingStatus(DeliveryTrackingStatus.ON_THE_WAY);
                order.setLatestNotification("Trip " + request.getTripNumber() + " delivered");
            }
        } else if (tripStatus == DispatchTripStatus.RETURNED) {
            order.setStatus(OrderStatus.RETURNED);
            order.setDeliveryTrackingStatus(DeliveryTrackingStatus.RETURNED);
            order.setReturnReason(tripRecord.getReturnReason());
            order.setReturnedQuantity(tripRecord.getReturnedQuantity());
            order.setDeliveredAt(null);
            order.setLatestNotification("Trip " + request.getTripNumber() + " returned");
        } else {
            order.setDeliveryTrackingStatus(DeliveryTrackingStatus.SCHEDULED_FOR_DISPATCH);
            order.setLatestNotification("Trip " + request.getTripNumber() + " scheduled");
        }

        orderRepository.save(order);
        if (tripStatus == DispatchTripStatus.DELIVERED && order.getStatus() == OrderStatus.DELIVERED) {
            orderNotificationService.createNotification(order, NotificationType.ORDER_DELIVERED);
        } else if (tripStatus == DispatchTripStatus.RETURNED) {
            orderNotificationService.createNotification(order, NotificationType.ORDER_RETURNED);
        } else if (tripStatus == DispatchTripStatus.SCHEDULED) {
            orderNotificationService.createNotification(order, NotificationType.DISPATCH_SCHEDULED);
        } else {
            orderNotificationService.createNotification(order, NotificationType.DELIVERY_STATUS_UPDATED);
        }

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

    private double resolveTruckCapacity(Order order, Double requestedCapacity) {
        if (requestedCapacity != null && requestedCapacity > 0) {
            return requestedCapacity;
        }

        OrderAssignment assignment = orderAssignmentRepository.findByOrder_Id(order.getId()).orElse(null);
        if (assignment != null && assignment.getTransitMixer() != null && assignment.getTransitMixer().getCapacityM3() != null
                && assignment.getTransitMixer().getCapacityM3() > 0) {
            return assignment.getTransitMixer().getCapacityM3();
        }

        return 6.0;
    }

    private List<Double> calculateTripLoads(double totalQuantityM3, double capacityM3) {
        List<Double> loads = new ArrayList<>();
        if (totalQuantityM3 <= 0 || capacityM3 <= 0) {
            return loads;
        }

        double remaining = totalQuantityM3;
        while (remaining > 0) {
            double tripQty = Math.min(capacityM3, remaining);
            tripQty = Math.round(tripQty * 100.0) / 100.0;
            loads.add(tripQty);
            remaining = Math.round((remaining - tripQty) * 100.0) / 100.0;
        }
        return loads;
    }

    private String resolveShiftByDispatchTime(LocalDateTime dispatchTime) {
        if (dispatchTime == null) {
            return "MORNING";
        }
        int hour = dispatchTime.getHour();
        if (hour >= 6 && hour < 15) {
            return "MORNING";
        }
        return "EVENING";
    }

    private Double parsePositiveDouble(Object value, Double fallbackValue) {
        if (value == null) {
            return fallbackValue;
        }
        try {
            double parsed = Double.parseDouble(String.valueOf(value));
            if (parsed > 0) {
                return parsed;
            }
            return fallbackValue;
        } catch (NumberFormatException ignored) {
            return fallbackValue;
        }
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
            case "RETURNED":
                return DispatchTripStatus.RETURNED;
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
            case "RETURNED":
                return DeliveryTrackingStatus.RETURNED;
            default:
                return null;
        }
    }

    private DeliveryTrackingStatus resolveTrackingStatus(Order order) {
        if (order.getStatus() == OrderStatus.RETURNED) {
            return DeliveryTrackingStatus.RETURNED;
        }
        if (order.getStatus() == OrderStatus.DELIVERED) {
            return DeliveryTrackingStatus.DELIVERED;
        }

        DeliveryTrackingStatus tracking = order.getDeliveryTrackingStatus();
        if (tracking == DeliveryTrackingStatus.ON_THE_WAY) {
            tracking = DeliveryTrackingStatus.IN_TRANSIT;
        }

        if (order.getStatus() == OrderStatus.IN_PRODUCTION) {
            return null;
        }
        if (order.getStatus() == OrderStatus.PENDING_APPROVAL || order.getStatus() == OrderStatus.REJECTED) {
            return null;
        }
        if (order.getStatus() == OrderStatus.APPROVED) {
            return tracking == DeliveryTrackingStatus.SCHEDULED_FOR_DISPATCH ? tracking : null;
        }

        if (order.getStatus() == OrderStatus.DISPATCHED) {
            // Ensure stale "SCHEDULED" tracking never overrides a dispatched order.
            if (tracking == null || tracking == DeliveryTrackingStatus.SCHEDULED_FOR_DISPATCH) {
                return DeliveryTrackingStatus.DISPATCHED;
            }
            return tracking;
        }

        if (tracking != null) {
            return tracking;
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
            case RETURNED:
                return "RETURNED";
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
        row.put("shift", trip.getShift());
        row.put("tripQuantityM3", trip.getTripQuantityM3());
        row.put("scheduledDispatchTime", trip.getScheduledDispatchTime());
        row.put("actualDispatchTime", trip.getActualDispatchTime());
        row.put("estimatedDeliveryTime", trip.getEstimatedDeliveryTime());
        row.put("deliveredTime", trip.getDeliveredTime());
        row.put("fuelUsedLiters", trip.getFuelUsedLiters());
        row.put("remarks", trip.getRemarks());
        row.put("returnReason", trip.getReturnReason());
        row.put("returnedQuantity", trip.getReturnedQuantity());
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
                    mixer.setCapacityM3(6.0);
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
        row.put("returnReason", order.getReturnReason());
        row.put("returnedQuantity", order.getReturnedQuantity());
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
            row.put("transitMixerCapacityM3",
                    assignment.getTransitMixer() != null ? assignment.getTransitMixer().getCapacityM3() : null);
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
            row.put("transitMixerCapacityM3", null);
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
