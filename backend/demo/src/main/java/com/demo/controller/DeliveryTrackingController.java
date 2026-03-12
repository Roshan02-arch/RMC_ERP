package com.demo.controller;

import com.demo.dto.DeliveryTrackingUpdateRequest;
import com.demo.entity.DeliveryTrackingStatus;
import com.demo.entity.Driver;
import com.demo.entity.NotificationType;
import com.demo.entity.Order;
import com.demo.entity.OrderAssignment;
import com.demo.entity.OrderStatus;
import com.demo.entity.TransitMixer;
import com.demo.entity.User;
import com.demo.repository.DriverRepository;
import com.demo.repository.DispatchTripRecordRepository;
import com.demo.repository.OrderAssignmentRepository;
import com.demo.repository.OrderRepository;
import com.demo.repository.TransitMixerRepository;
import com.demo.repository.UserRepository;
import com.demo.service.OrderNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/delivery-tracking")
@CrossOrigin("*")
public class DeliveryTrackingController {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderAssignmentRepository orderAssignmentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DriverRepository driverRepository;

    @Autowired
    private TransitMixerRepository transitMixerRepository;

    @Autowired
    private OrderNotificationService orderNotificationService;

    @Autowired
    private DispatchTripRecordRepository dispatchTripRecordRepository;

    @GetMapping("/orders/{orderId}")
    public ResponseEntity<?> getTracking(@PathVariable String orderId, @RequestParam Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }
        Order order = orderRepository.findByOrderId(orderId).orElse(null);
        if (order == null) {
            return ResponseEntity.status(404).body(Map.of("message", "Order not found"));
        }

        if (order.getUser() == null || !Objects.equals(order.getUser().getId(), user.getId())) {
            return ResponseEntity.status(403).body(Map.of("message", "You are not authorized to view this order"));
        }

        OrderAssignment assignment = orderAssignmentRepository.findByOrder_Id(order.getId()).orElse(null);
        DeliveryTrackingStatus trackingStatus = resolveTrackingStatus(order);
        boolean gpsAvailable = order.getLiveLatitude() != null && order.getLiveLongitude() != null;
        boolean delivered = trackingStatus == DeliveryTrackingStatus.DELIVERED
                || order.getStatus() == OrderStatus.DELIVERED;
        boolean returned = trackingStatus == DeliveryTrackingStatus.RETURNED
                || order.getStatus() == OrderStatus.RETURNED;

        Map<String, Object> dispatchInformation = new HashMap<>();
        dispatchInformation.put("dispatchStatus", trackingStatus);
        dispatchInformation.put("assignedTransitMixerNumber", assignment != null && assignment.getTransitMixer() != null
                ? assignment.getTransitMixer().getMixerNumber()
                : null);
        dispatchInformation.put("dispatchDateTime", order.getDispatchDateTime());

        Map<String, Object> driverDetails = new HashMap<>();
        driverDetails.put("name", assignment != null && assignment.getDriver() != null
                ? assignment.getDriver().getDriverName()
                : null);
        driverDetails.put("shift", assignment != null && assignment.getDriver() != null
                ? assignment.getDriver().getDriverShift()
                : null);
        dispatchInformation.put("driverDetails", driverDetails);

        Map<String, Object> realtimeTracking = new HashMap<>();
        realtimeTracking.put("deliveryStatus", trackingStatus);
        realtimeTracking.put("gpsAvailable", gpsAvailable);
        if (gpsAvailable) {
            realtimeTracking.put("liveLocation", Map.of(
                    "latitude", order.getLiveLatitude(),
                    "longitude", order.getLiveLongitude()
            ));
        } else {
            realtimeTracking.put("liveLocation", null);
        }

        Map<String, Object> estimatedDelivery = new HashMap<>();
        estimatedDelivery.put("expectedArrivalTime", order.getExpectedArrivalTime());
        estimatedDelivery.put("delayInMinutes", order.getDelayInMinutes());
        estimatedDelivery.put("delayUpdate", order.getLatestNotification());

        Map<String, Object> deliveryConfirmation = new HashMap<>();
        deliveryConfirmation.put("delivered", delivered);
        deliveryConfirmation.put("returned", returned);
        deliveryConfirmation.put("deliveredAt", order.getDeliveredAt());
        deliveryConfirmation.put("details", order.getDeliveryConfirmationDetails());
        deliveryConfirmation.put("returnReason", order.getReturnReason());
        deliveryConfirmation.put("returnedQuantity", order.getReturnedQuantity());

        Map<String, Object> response = new HashMap<>();
        response.put("orderId", order.getOrderId());
        response.put("trackingReadOnly", true);
        response.put("dispatchInformation", dispatchInformation);
        response.put("realTimeTracking", realtimeTracking);
        response.put("estimatedDeliveryTime", estimatedDelivery);
        response.put("deliveryConfirmation", deliveryConfirmation);
        response.put("tripDetails", dispatchTripRecordRepository.findByOrder_IdOrderByTripNumberAsc(order.getId())
                .stream()
                .map(trip -> {
                    Map<String, Object> row = new HashMap<>();
                    row.put("tripNumber", trip.getTripNumber());
                    row.put("status", trip.getStatus() == null ? "" : trip.getStatus().name());
                    row.put("shift", trip.getShift() == null ? "" : trip.getShift());
                    row.put("tripQuantityM3", trip.getTripQuantityM3());
                    row.put("transitMixerNumber", trip.getTransitMixerNumber() == null ? "" : trip.getTransitMixerNumber());
                    row.put("driverName", trip.getDriverName() == null ? "" : trip.getDriverName());
                    row.put("dispatchTime", trip.getScheduledDispatchTime());
                    row.put("estimatedDeliveryTime", trip.getEstimatedDeliveryTime());
                    row.put("returnReason", trip.getReturnReason() == null ? "" : trip.getReturnReason());
                    row.put("returnedQuantity", trip.getReturnedQuantity());
                    return row;
                })
                .toList());
        response.put("nextStage", delivered ? "BILLING_AND_PAYMENT" : returned ? "DELIVERY_RETURNED" : "DELIVERY_IN_PROGRESS");

        return ResponseEntity.ok(response);
    }

    @PutMapping("/admin/orders/{orderId}")
    public ResponseEntity<?> updateTracking(
            @PathVariable String orderId,
            @RequestParam Long adminUserId,
            @RequestBody DeliveryTrackingUpdateRequest request) {

        User adminUser = userRepository.findById(adminUserId).orElse(null);
        if (adminUser == null) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }
        if (!"ADMIN".equalsIgnoreCase(adminUser.getRole())) {
            return ResponseEntity.status(403).body(Map.of("message", "Only admin can update tracking details"));
        }

        Order order = orderRepository.findByOrderId(orderId).orElse(null);
        if (order == null) {
            return ResponseEntity.status(404).body(Map.of("message", "Order not found"));
        }

        OrderStatus previousStatus = order.getStatus();
        DeliveryTrackingStatus previousTrackingStatus = resolveTrackingStatus(order);
        String previousLatestNotification = order.getLatestNotification();

        LocalDateTime dispatchDateTime = request.getDispatchDateTime() != null
                ? request.getDispatchDateTime()
                : order.getDispatchDateTime();
        LocalDateTime expectedArrivalTime = request.getExpectedArrivalTime() != null
                ? request.getExpectedArrivalTime()
                : order.getExpectedArrivalTime();

        if (dispatchDateTime != null
                && expectedArrivalTime != null
                && !expectedArrivalTime.isAfter(dispatchDateTime)) {
            return ResponseEntity.badRequest().body(Map.of("message", "ETA must be after dispatch time"));
        }

        if ((request.getLiveLatitude() == null) != (request.getLiveLongitude() == null)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Both latitude and longitude are required"));
        }

        if (request.getDispatchDateTime() != null) {
            order.setDispatchDateTime(request.getDispatchDateTime());
        }
        if (request.getExpectedArrivalTime() != null) {
            order.setExpectedArrivalTime(request.getExpectedArrivalTime());
        }
        if (request.getDelayInMinutes() != null) {
            order.setDelayInMinutes(request.getDelayInMinutes());
        }
        if (!isBlank(request.getDelayUpdateMessage())) {
            order.setLatestNotification(request.getDelayUpdateMessage().trim());
        }
        if (request.getLiveLatitude() != null && request.getLiveLongitude() != null) {
            order.setLiveLatitude(request.getLiveLatitude());
            order.setLiveLongitude(request.getLiveLongitude());
        }
        if (!isBlank(request.getDeliveryConfirmationDetails())) {
            order.setDeliveryConfirmationDetails(request.getDeliveryConfirmationDetails().trim());
        }
        if (request.getDeliveredAt() != null) {
            order.setDeliveredAt(request.getDeliveredAt());
        }
        if (!isBlank(request.getReturnReason())) {
            order.setReturnReason(request.getReturnReason().trim());
        }
        if (request.getReturnedQuantity() != null && request.getReturnedQuantity() > 0) {
            order.setReturnedQuantity(request.getReturnedQuantity());
        }

        OrderAssignment assignment = getOrCreateAssignment(order);
        if (!isBlank(request.getDriverName())) {
            assignment.setDriver(upsertDriver(request.getDriverName().trim(), request.getDriverShift()));
        }
        if (!isBlank(request.getTransitMixerNumber())) {
            assignment.setTransitMixer(upsertMixer(request.getTransitMixerNumber().trim()));
        }
        orderAssignmentRepository.save(assignment);

        if (!isBlank(request.getDeliveryStatus())) {
            DeliveryTrackingStatus trackingStatus = parseDeliveryStatus(request.getDeliveryStatus());
            if (trackingStatus == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Invalid delivery status"));
            }

            order.setDeliveryTrackingStatus(trackingStatus);
            if (trackingStatus == DeliveryTrackingStatus.SCHEDULED_FOR_DISPATCH) {
                if (order.getStatus() != OrderStatus.IN_PRODUCTION) {
                    order.setStatus(OrderStatus.APPROVED);
                }
                order.setDeliveredAt(null);
                order.setReturnReason(null);
                order.setReturnedQuantity(null);
            } else if (trackingStatus == DeliveryTrackingStatus.DELIVERED) {
                order.setStatus(OrderStatus.DELIVERED);
                if (order.getDeliveredAt() == null) {
                    order.setDeliveredAt(LocalDateTime.now());
                }
                order.setReturnReason(null);
                order.setReturnedQuantity(null);
                if (isBlank(order.getLatestNotification())) {
                    order.setLatestNotification("Concrete delivered successfully");
                }
            } else if (trackingStatus == DeliveryTrackingStatus.RETURNED) {
                order.setStatus(OrderStatus.RETURNED);
                order.setDeliveredAt(null);
                if (isBlank(order.getReturnReason())) {
                    order.setReturnReason("Returned from site");
                }
                if (order.getReturnedQuantity() == null || order.getReturnedQuantity() <= 0) {
                    order.setReturnedQuantity(order.getQuantity());
                }
                if (isBlank(order.getLatestNotification())) {
                    order.setLatestNotification("Delivery returned: " + order.getReturnReason());
                }
            } else if (trackingStatus == DeliveryTrackingStatus.DISPATCHED
                    || trackingStatus == DeliveryTrackingStatus.IN_TRANSIT
                    || trackingStatus == DeliveryTrackingStatus.ON_THE_WAY) {
                order.setStatus(OrderStatus.DISPATCHED);
                order.setDeliveredAt(null);
                order.setReturnReason(null);
                order.setReturnedQuantity(null);
            }
        }

        DeliveryTrackingStatus updatedStatus = resolveTrackingStatus(order);
        orderRepository.save(order);
        boolean shouldNotify = !Objects.equals(previousStatus, order.getStatus())
                || !Objects.equals(previousTrackingStatus, updatedStatus)
                || (!isBlank(order.getLatestNotification()) && !Objects.equals(previousLatestNotification, order.getLatestNotification()));
        if (shouldNotify) {
            if (updatedStatus == DeliveryTrackingStatus.DELIVERED || order.getStatus() == OrderStatus.DELIVERED) {
                orderNotificationService.createNotification(order, NotificationType.ORDER_DELIVERED);
            } else if (updatedStatus == DeliveryTrackingStatus.RETURNED || order.getStatus() == OrderStatus.RETURNED) {
                orderNotificationService.createNotification(order, NotificationType.ORDER_RETURNED);
            } else if (updatedStatus == DeliveryTrackingStatus.SCHEDULED_FOR_DISPATCH) {
                orderNotificationService.createNotification(order, NotificationType.DISPATCH_SCHEDULED);
            } else if (order.getStatus() == OrderStatus.IN_PRODUCTION) {
                orderNotificationService.createNotification(order, NotificationType.IN_PRODUCTION);
            } else if (order.getStatus() == OrderStatus.APPROVED && updatedStatus == null) {
                orderNotificationService.createNotification(order, NotificationType.ORDER_APPROVED);
            } else {
                orderNotificationService.createNotification(order, NotificationType.DELIVERY_STATUS_UPDATED);
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Delivery tracking updated successfully");
        response.put("orderId", order.getOrderId());
        response.put("deliveryStatus", updatedStatus);
        response.put("nextStage", updatedStatus == DeliveryTrackingStatus.DELIVERED
                ? "BILLING_AND_PAYMENT"
                : updatedStatus == DeliveryTrackingStatus.RETURNED
                    ? "DELIVERY_RETURNED"
                    : "DELIVERY_IN_PROGRESS");
        return ResponseEntity.ok(response);
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
            // If status is dispatched, don't let stale scheduled tracking override it.
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

    private OrderAssignment getOrCreateAssignment(Order order) {
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
                    Driver newDriver = new Driver();
                    newDriver.setDriverName(driverName);
                    newDriver.setDriverShift(driverShift);
                    return driverRepository.save(newDriver);
                });

        if (!isBlank(driverShift)) {
            driver.setDriverShift(driverShift.trim());
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

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
