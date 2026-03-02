package com.demo.controller;

import com.demo.dto.DispatchScheduleRequest;
import com.demo.dto.ProductionScheduleRequest;
import com.demo.dto.RescheduleRequest;
import com.demo.dto.VehicleScheduleRequest;
import com.demo.entity.Driver;
import com.demo.entity.Order;
import com.demo.entity.OrderAssignment;
import com.demo.entity.User;
import com.demo.entity.OrderStatus;
import com.demo.entity.TransitMixer;
import com.demo.repository.DriverRepository;
import com.demo.repository.OrderAssignmentRepository;
import com.demo.repository.OrderRepository;
import com.demo.repository.TransitMixerRepository;
import com.demo.repository.UserRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
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


    // ✅ 1. Get All Orders
    @GetMapping("/orders")
    public List<Map<String, Object>> getAllOrders() {
        List<Map<String, Object>> response = new ArrayList<>();
        for (Order order : orderRepository.findAll()) {
            response.add(toOrderView(order));
        }
        return response;
    }

    // ✅ 2. Get Pending Orders
    @GetMapping("/orders/pending")
    public List<Map<String, Object>> getPendingOrders() {
        List<Map<String, Object>> response = new ArrayList<>();
        for (Order order : orderRepository.findByStatus(OrderStatus.PENDING_APPROVAL)) {
            response.add(toOrderView(order));
        }
        return response;
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

    @PutMapping("/orders/{orderId}/schedule/production")
    public ResponseEntity<?> scheduleProduction(
            @PathVariable String orderId,
            @RequestBody ProductionScheduleRequest request) {

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

        return ResponseEntity.ok(Map.of(
                "message", "Production scheduled successfully",
                "orderId", order.getOrderId()
        ));
    }

    @PutMapping("/orders/{orderId}/schedule/dispatch")
    public ResponseEntity<?> scheduleDispatch(
            @PathVariable String orderId,
            @RequestBody DispatchScheduleRequest request) {

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

        order.setDispatchDateTime(request.getDispatchDateTime());
        order.setTripPlanning(request.getTripPlanning());
        order.setDeliverySequence(request.getDeliverySequence());
        order.setExpectedArrivalTime(request.getExpectedArrivalTime());
        order.setStatus(OrderStatus.DISPATCHED);
        order.setLatestNotification("Dispatch schedule shared with dispatch team");
        orderRepository.save(order);

        return ResponseEntity.ok(Map.of(
                "message", "Dispatch scheduled successfully",
                "orderId", order.getOrderId()
        ));
    }

    @PutMapping("/orders/{orderId}/schedule/vehicle")
    public ResponseEntity<?> scheduleVehicleAndDriver(
            @PathVariable String orderId,
            @RequestBody VehicleScheduleRequest request) {

        Order order = orderRepository.findByOrderId(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

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

        return ResponseEntity.ok(Map.of(
                "message", "Vehicle and driver assigned successfully",
                "orderId", order.getOrderId()
        ));
    }

    @PutMapping("/orders/{orderId}/reschedule")
    public ResponseEntity<?> rescheduleOrder(
            @PathVariable String orderId,
            @RequestBody RescheduleRequest request) {

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
                    return transitMixerRepository.save(mixer);
                });
    }

    private Map<String, Object> toOrderView(Order order) {
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
        row.put("latestNotification", order.getLatestNotification());

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

        return row;
    }

}
