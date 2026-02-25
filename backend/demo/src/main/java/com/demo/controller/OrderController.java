package com.demo.controller;
import com.demo.entity.OrderStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.demo.entity.Order;
import com.demo.repository.OrderRepository;
import com.demo.dto.OrderRequest;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import com.demo.entity.User;
import com.demo.repository.UserRepository;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/create")
    public ResponseEntity<?> createOrder(@RequestBody OrderRequest request) {

        if (request.getGrade() == null ||
                request.getQuantity() <= 0 ||
                request.getDeliveryDate() == null ||
                request.getAddress() == null) {

            return ResponseEntity.badRequest()
                    .body(Map.of("message", "All fields are required"));
        }

        // Pricing logic
        double pricePerUnit = switch (request.getGrade()) {
            case "M20" -> 5000;
            case "M25" -> 5500;
            case "M30" -> 6000;
            case "M35" -> 6500;
            default -> 0;
        };

        double total = pricePerUnit * request.getQuantity();

        Order order = new Order();
        order.setOrderId("ORD-" + UUID.randomUUID().toString().substring(0, 8));
        order.setGrade(request.getGrade());
        order.setQuantity(request.getQuantity());
        order.setDeliveryDate(request.getDeliveryDate());
        order.setAddress(request.getAddress());
        order.setTotalPrice(total);
        order.setStatus(OrderStatus.PENDING_APPROVAL);





        // 🔥 Connect order to user

        // 🔥 STEP 2 — Connect order to logged-in user

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        order.setUser(user);

        orderRepository.save(order);


        return ResponseEntity.ok(Map.of(
                "message", "Order submitted successfully",
                "orderId", order.getOrderId(),
                "totalPrice", total,
                "status", order.getStatus()
        ));

    }
    @GetMapping("/my-orders/{userId}")
    public ResponseEntity<?> getMyOrders(@PathVariable Long userId) {

        List<Order> orders = orderRepository.findByUser_Id(userId);

        return ResponseEntity.ok(orders);
    }
}