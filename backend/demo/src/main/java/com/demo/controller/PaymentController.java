package com.demo.controller;

import com.demo.entity.Order;
import com.demo.entity.PaymentRecord;
import com.demo.repository.OrderRepository;
import com.demo.repository.PaymentRecordRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin("*")
public class PaymentController {

    @Autowired
    private PaymentRecordRepository paymentRecordRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Value("${razorpay.key-id:}")
    private String razorpayKeyId;

    @Value("${razorpay.key-secret:}")
    private String razorpayKeySecret;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @GetMapping("/order/{orderId}")
    public ResponseEntity<?> getPaymentsByOrder(@PathVariable String orderId) {
        List<Map<String, Object>> response = paymentRecordRepository
                .findByOrder_OrderIdOrderByPaidAtDesc(orderId)
                .stream()
                .map(this::toView)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/order/{orderId}")
    public ResponseEntity<?> addPayment(
            @PathVariable String orderId,
            @RequestBody Map<String, Object> payload
    ) {
        try {
            Order order = orderRepository.findByOrderId(orderId)
                    .orElseThrow(() -> new RuntimeException("Order not found"));

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
                    "payment", toView(saved)
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Unable to save payment"));
        }
    }

    @PostMapping("/razorpay/create-order")
    public ResponseEntity<?> createRazorpayOrder(@RequestBody Map<String, Object> payload) {
        try {
            if (razorpayKeyId == null || razorpayKeyId.isBlank() || razorpayKeySecret == null || razorpayKeySecret.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "Razorpay is not configured. Set razorpay.key-id and razorpay.key-secret."
                ));
            }

            String orderId = String.valueOf(payload.getOrDefault("orderId", "")).trim();
            double amount = Double.parseDouble(String.valueOf(payload.getOrDefault("amount", 0)));
            if (orderId.isEmpty() || amount <= 0) {
                return ResponseEntity.badRequest().body(Map.of("message", "Invalid Razorpay order request"));
            }

            Order order = orderRepository.findByOrderId(orderId)
                    .orElseThrow(() -> new RuntimeException("Order not found"));

            int amountPaise = (int) Math.round(amount * 100);
            String payloadJson = objectMapper.writeValueAsString(Map.of(
                    "amount", amountPaise,
                    "currency", "INR",
                    "receipt", "rcpt_" + orderId + "_" + System.currentTimeMillis(),
                    "notes", Map.of("appOrderId", orderId)
            ));

            String auth = Base64.getEncoder().encodeToString((razorpayKeyId + ":" + razorpayKeySecret).getBytes(StandardCharsets.UTF_8));
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.razorpay.com/v1/orders"))
                    .header("Authorization", "Basic " + auth)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payloadJson))
                    .build();

            HttpClient httpClient = HttpClient.newBuilder().build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "Unable to create Razorpay order",
                        "details", response.body()
                ));
            }

            JsonNode node = objectMapper.readTree(response.body());
            return ResponseEntity.ok(Map.of(
                    "key", razorpayKeyId,
                    "razorpayOrderId", node.path("id").asText(),
                    "amount", node.path("amount").asInt(),
                    "currency", node.path("currency").asText("INR")
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Unable to initiate Razorpay payment"));
        }
    }

    @PostMapping("/razorpay/verify")
    public ResponseEntity<?> verifyRazorpayPayment(@RequestBody Map<String, Object> payload) {
        try {
            if (razorpayKeySecret == null || razorpayKeySecret.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Razorpay secret not configured"));
            }

            String appOrderId = String.valueOf(payload.getOrDefault("orderId", "")).trim();
            String razorpayOrderId = String.valueOf(payload.getOrDefault("razorpayOrderId", "")).trim();
            String razorpayPaymentId = String.valueOf(payload.getOrDefault("razorpayPaymentId", "")).trim();
            String razorpaySignature = String.valueOf(payload.getOrDefault("razorpaySignature", "")).trim();
            double amount = Double.parseDouble(String.valueOf(payload.getOrDefault("amount", 0)));

            if (appOrderId.isEmpty() || razorpayOrderId.isEmpty() || razorpayPaymentId.isEmpty() || razorpaySignature.isEmpty() || amount <= 0) {
                return ResponseEntity.badRequest().body(Map.of("message", "Invalid verification payload"));
            }

            String expectedSignature = hmacSha256Hex(razorpayOrderId + "|" + razorpayPaymentId, razorpayKeySecret);
            if (!expectedSignature.equals(razorpaySignature)) {
                return ResponseEntity.badRequest().body(Map.of("message", "Razorpay signature verification failed"));
            }

            Order order = orderRepository.findByOrderId(appOrderId)
                    .orElseThrow(() -> new RuntimeException("Order not found"));

            PaymentRecord record = new PaymentRecord();
            record.setOrder(order);
            record.setAmount(amount);
            record.setMethod("RAZORPAY");
            record.setPaidAt(LocalDateTime.now());
            record.setTransactionId(razorpayPaymentId);
            PaymentRecord saved = paymentRecordRepository.save(record);

            return ResponseEntity.ok(Map.of(
                    "message", "Razorpay payment verified and recorded",
                    "payment", toView(saved)
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Unable to verify Razorpay payment"));
        }
    }

    private Map<String, Object> toView(PaymentRecord p) {
        return Map.of(
                "id", p.getId(),
                "orderId", p.getOrder() != null ? p.getOrder().getOrderId() : null,
                "amount", p.getAmount(),
                "method", p.getMethod(),
                "paidAt", p.getPaidAt(),
                "transactionId", p.getTransactionId()
        );
    }

    private String hmacSha256Hex(String data, String secret) throws Exception {
        Mac hmac = Mac.getInstance("HmacSHA256");
        SecretKeySpec keySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        hmac.init(keySpec);
        byte[] raw = hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder(raw.length * 2);
        for (byte b : raw) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
