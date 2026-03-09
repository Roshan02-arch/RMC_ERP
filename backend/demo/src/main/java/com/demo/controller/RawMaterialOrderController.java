package com.demo.controller;

import com.demo.entity.RawMaterial;
import com.demo.entity.RawMaterialOrder;
import com.demo.entity.User;
import com.demo.repository.RawMaterialOrderRepository;
import com.demo.repository.RawMaterialRepository;
import com.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@CrossOrigin("*")
public class RawMaterialOrderController {

    @Autowired
    private RawMaterialRepository rawMaterialRepository;

    @Autowired
    private RawMaterialOrderRepository rawMaterialOrderRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/api/inventory/raw-materials")
    public List<Map<String, Object>> getRawMaterialsForCustomer() {
        ensureDefaultMaterialsForCustomer();
        return rawMaterialRepository.findAll().stream()
                .map(this::toMaterialView)
                .collect(Collectors.toList());
    }

    @PostMapping("/api/inventory/raw-material-orders")
    public ResponseEntity<?> createRawMaterialOrder(@RequestBody Map<String, Object> payload) {
        try {
            Long userId = Long.valueOf(String.valueOf(payload.getOrDefault("userId", 0)));
            Long materialId = Long.valueOf(String.valueOf(payload.getOrDefault("materialId", 0)));
            double quantity = Double.parseDouble(String.valueOf(payload.getOrDefault("quantity", 0)));
            String address = String.valueOf(payload.getOrDefault("address", "")).trim();

            if (userId <= 0 || materialId <= 0 || quantity <= 0 || address.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Invalid order details"));
            }

            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            RawMaterial material = rawMaterialRepository.findById(materialId)
                    .orElseThrow(() -> new RuntimeException("Raw material not found"));

            if (material.getQuantity() < quantity) {
                return ResponseEntity.badRequest().body(Map.of("message", "Insufficient stock for selected raw material"));
            }

            RawMaterialOrder order = new RawMaterialOrder();
            order.setUserId(user.getId());
            order.setCustomerName(user.getName());
            order.setCustomerEmail(user.getEmail());
            order.setCustomerPhone(user.getNumber());
            order.setMaterialName(material.getName());
            order.setQuantity(quantity);
            order.setUnit(material.getUnit());
            order.setPricePerUnit(material.getPricePerUnit());
            order.setTotalPrice(material.getPricePerUnit() * quantity);
            order.setAddress(address);
            order.setStatus("APPROVED");
            order.setCreatedAt(LocalDateTime.now());

            RawMaterialOrder saved = rawMaterialOrderRepository.save(order);
            material.setQuantity(material.getQuantity() - quantity);
            material.setUpdatedAt(LocalDateTime.now());
            rawMaterialRepository.save(material);

            return ResponseEntity.ok(Map.of(
                    "message", "Raw material order placed successfully",
                    "order", toOrderView(saved)
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Unable to create raw material order"));
        }
    }

    @GetMapping("/api/inventory/raw-material-orders/{userId}")
    public ResponseEntity<?> getRawMaterialOrdersByUser(@PathVariable Long userId) {
        List<Map<String, Object>> rows = rawMaterialOrderRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toOrderView)
                .collect(Collectors.toList());
        return ResponseEntity.ok(rows);
    }

    @GetMapping("/api/admin/inventory/raw-material-orders")
    public ResponseEntity<?> getAllRawMaterialOrdersForAdmin() {
        List<Map<String, Object>> rows = rawMaterialOrderRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toOrderView)
                .collect(Collectors.toList());
        return ResponseEntity.ok(rows);
    }

    @PutMapping("/api/admin/inventory/raw-material-orders/{id}/status")
    public ResponseEntity<?> updateRawMaterialOrderStatus(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload
    ) {
        try {
            String status = String.valueOf(payload.getOrDefault("status", "")).trim().toUpperCase();
            if (status.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Status is required"));
            }

            RawMaterialOrder order = rawMaterialOrderRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Raw material order not found"));
            order.setStatus(status);
            rawMaterialOrderRepository.save(order);
            return ResponseEntity.ok(Map.of("message", "Status updated successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Unable to update status"));
        }
    }

    @DeleteMapping("/api/inventory/raw-material-orders/{id}")
    public ResponseEntity<?> deleteRawMaterialOrder(@PathVariable Long id) {
        try {
            RawMaterialOrder order = rawMaterialOrderRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Raw material order not found"));
            rawMaterialOrderRepository.delete(order);
            return ResponseEntity.ok(Map.of("message", "Raw material order deleted"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    private Map<String, Object> toMaterialView(RawMaterial m) {
        return Map.of(
                "id", m.getId(),
                "name", m.getName(),
                "quantity", m.getQuantity(),
                "unit", m.getUnit(),
                "supplier", m.getSupplier(),
                "pricePerUnit", m.getPricePerUnit(),
                "reorderLevel", m.getReorderLevel(),
                "imageUrl", m.getImageUrl() == null ? "" : m.getImageUrl()
        );
    }

    private void ensureDefaultMaterialsForCustomer() {
        List<Map<String, Object>> defaults = Arrays.asList(
                Map.of("name", "Cement", "unit", "kg", "supplier", "UltraTech", "price", 8.0d, "reorder", 1000d, "imageUrl", "https://images.unsplash.com/photo-1618397746666-63405ce5d015?auto=format&fit=crop&w=1200&q=80"),
                Map.of("name", "Sand", "unit", "kg", "supplier", "Local River Supply", "price", 2.5d, "reorder", 3000d, "imageUrl", "https://images.unsplash.com/photo-1508179522353-11ba468c4a1c?auto=format&fit=crop&w=1200&q=80"),
                Map.of("name", "Aggregates", "unit", "kg", "supplier", "Stone Crusher Plant", "price", 3.0d, "reorder", 5000d, "imageUrl", "https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=1200&q=80"),
                Map.of("name", "Admixtures", "unit", "litre", "supplier", "Fosroc", "price", 120.0d, "reorder", 300d, "imageUrl", "https://images.unsplash.com/photo-1581094271901-8022df4466f9?auto=format&fit=crop&w=1200&q=80"),
                Map.of("name", "Water", "unit", "litre", "supplier", "Plant Water Unit", "price", 0.5d, "reorder", 10000d, "imageUrl", "https://images.unsplash.com/photo-1495774539583-885e02cca8c2?auto=format&fit=crop&w=1200&q=80")
        );

        for (Map<String, Object> row : defaults) {
            String name = String.valueOf(row.get("name"));
            Optional<RawMaterial> existing = rawMaterialRepository.findByNameIgnoreCase(name);
            if (existing.isPresent()) {
                RawMaterial material = existing.get();
                if (material.getImageUrl() == null || material.getImageUrl().isBlank()) {
                    material.setImageUrl(String.valueOf(row.get("imageUrl")));
                }
                if (material.getPricePerUnit() <= 0) {
                    material.setPricePerUnit((Double) row.get("price"));
                }
                material.setUpdatedAt(LocalDateTime.now());
                rawMaterialRepository.save(material);
                continue;
            }

            RawMaterial material = new RawMaterial();
            material.setName(name);
            material.setQuantity(0);
            material.setUnit(String.valueOf(row.get("unit")));
            material.setSupplier(String.valueOf(row.get("supplier")));
            material.setPricePerUnit((Double) row.get("price"));
            material.setReorderLevel((Double) row.get("reorder"));
            material.setImageUrl(String.valueOf(row.get("imageUrl")));
            material.setUpdatedAt(LocalDateTime.now());
            rawMaterialRepository.save(material);
        }
    }

    private Map<String, Object> toOrderView(RawMaterialOrder o) {
        String resolvedStatus = Optional.ofNullable(o.getStatus()).orElse("APPROVED");
        if ("PENDING_APPROVAL".equalsIgnoreCase(resolvedStatus)) {
            resolvedStatus = "APPROVED";
        }

        Map<String, Object> row = new HashMap<>();
        row.put("id", o.getId());
        row.put("userId", o.getUserId());
        row.put("customerName", Optional.ofNullable(o.getCustomerName()).orElse(""));
        row.put("customerEmail", Optional.ofNullable(o.getCustomerEmail()).orElse(""));
        row.put("customerPhone", Optional.ofNullable(o.getCustomerPhone()).orElse(""));
        row.put("materialName", o.getMaterialName());
        row.put("quantity", o.getQuantity());
        row.put("unit", o.getUnit());
        row.put("pricePerUnit", o.getPricePerUnit());
        row.put("totalPrice", o.getTotalPrice());
        row.put("address", Optional.ofNullable(o.getAddress()).orElse(""));
        row.put("status", resolvedStatus);
        row.put("createdAt", o.getCreatedAt());
        return row;
    }
}
