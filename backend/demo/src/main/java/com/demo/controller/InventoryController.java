package com.demo.controller;

import com.demo.entity.InventoryMovement;
import com.demo.entity.InventoryPurchaseOrder;
import com.demo.entity.RawMaterial;
import com.demo.repository.InventoryMovementRepository;
import com.demo.repository.InventoryPurchaseOrderRepository;
import com.demo.repository.RawMaterialRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/inventory")
@CrossOrigin("*")
public class InventoryController {

    @Autowired
    private RawMaterialRepository rawMaterialRepository;

    @Autowired
    private InventoryMovementRepository inventoryMovementRepository;

    @Autowired
    private InventoryPurchaseOrderRepository inventoryPurchaseOrderRepository;

    @GetMapping("/materials")
    public List<RawMaterial> getMaterials() {
        if (rawMaterialRepository.count() == 0) {
            ensureDefaultMaterials();
        }
        return rawMaterialRepository.findAll();
    }

    @PostMapping("/materials")
    public ResponseEntity<?> createMaterial(@RequestBody RawMaterial rawMaterial) {
        try {
            if (rawMaterial.getName() == null || rawMaterial.getName().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Material name is required"));
            }
            if (rawMaterialRepository.findByNameIgnoreCase(rawMaterial.getName()).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Material already exists"));
            }
            if (rawMaterial.getPricePerUnit() <= 0) {
                rawMaterial.setPricePerUnit(defaultMaterialPrice(rawMaterial.getName()));
            }
            if (rawMaterial.getImageUrl() == null || rawMaterial.getImageUrl().isBlank()) {
                rawMaterial.setImageUrl(defaultMaterialImage(rawMaterial.getName()));
            }
            rawMaterial.setUpdatedAt(LocalDateTime.now());
            RawMaterial saved = rawMaterialRepository.save(rawMaterial);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Unable to create material"));
        }
    }

    @PutMapping("/materials/{id}")
    public ResponseEntity<?> updateMaterial(@PathVariable Long id, @RequestBody RawMaterial payload) {
        try {
            RawMaterial material = rawMaterialRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Material not found"));
            String nextName = payload.getName() == null ? material.getName() : payload.getName().trim();
            if (nextName.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Material name is required"));
            }
            Optional<RawMaterial> duplicate = rawMaterialRepository.findByNameIgnoreCase(nextName);
            if (duplicate.isPresent() && !duplicate.get().getId().equals(material.getId())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Material already exists"));
            }
            material.setName(nextName);
            material.setUnit(payload.getUnit());
            material.setSupplier(payload.getSupplier());
            material.setReorderLevel(payload.getReorderLevel());
            material.setQuantity(payload.getQuantity());
            if (payload.getPricePerUnit() > 0) {
                material.setPricePerUnit(payload.getPricePerUnit());
            }
            if (payload.getImageUrl() != null && !payload.getImageUrl().isBlank()) {
                material.setImageUrl(payload.getImageUrl());
            } else if (material.getImageUrl() == null || material.getImageUrl().isBlank()) {
                material.setImageUrl(defaultMaterialImage(material.getName()));
            }
            material.setUpdatedAt(LocalDateTime.now());
            return ResponseEntity.ok(rawMaterialRepository.save(material));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Unable to update material"));
        }
    }

    @DeleteMapping("/materials/{id}")
    @Transactional
    public ResponseEntity<?> deleteMaterial(@PathVariable Long id) {
        try {
            RawMaterial material = rawMaterialRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Material not found"));

            inventoryMovementRepository.deleteByRawMaterial_Id(id);
            inventoryPurchaseOrderRepository.deleteByRawMaterial_Id(id);
            rawMaterialRepository.delete(material);

            return ResponseEntity.ok(Map.of("message", "Material deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Unable to delete material"));
        }
    }

    @GetMapping("/alerts")
    public List<Map<String, Object>> getReorderAlerts() {
        return rawMaterialRepository.findAll()
                .stream()
                .filter(m -> m.getQuantity() < m.getReorderLevel())
                .map(m -> Map.<String, Object>of(
                        "id", m.getId(),
                        "name", m.getName(),
                        "quantity", m.getQuantity(),
                        "reorderLevel", m.getReorderLevel(),
                        "supplier", m.getSupplier(),
                        "unit", m.getUnit()
                ))
                .collect(Collectors.toList());
    }

    @PostMapping("/materials/{id}/restock")
    public ResponseEntity<?> restockMaterial(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        return adjustStock(id, payload, "RESTOCK");
    }

    @PostMapping("/materials/{id}/consume")
    public ResponseEntity<?> consumeMaterial(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        return adjustStock(id, payload, "CONSUMPTION");
    }

    @GetMapping("/movements")
    public List<Map<String, Object>> getMovements(
            @RequestParam(required = false) Long materialId,
            @RequestParam(defaultValue = "daily") String period
    ) {
        LocalDateTime start = periodStart(period);
        LocalDateTime end = LocalDateTime.now();
        List<InventoryMovement> rows;
        if (materialId != null) {
            rows = inventoryMovementRepository.findByRawMaterial_IdAndCreatedAtBetweenOrderByCreatedAtDesc(materialId, start, end);
        } else {
            rows = inventoryMovementRepository.findByCreatedAtBetweenOrderByCreatedAtDesc(start, end);
        }
        return rows.stream().map(this::toMovementView).collect(Collectors.toList());
    }

    @GetMapping("/reports/stock")
    public List<Map<String, Object>> getStockReport(@RequestParam(defaultValue = "daily") String period) {
        LocalDateTime start = periodStart(period);
        LocalDateTime end = LocalDateTime.now();
        List<InventoryMovement> movements = inventoryMovementRepository.findByCreatedAtBetweenOrderByCreatedAtDesc(start, end);

        Map<Long, Double> totalConsumed = new HashMap<>();
        Map<Long, Double> totalRestocked = new HashMap<>();
        Map<Long, Long> movementCount = new HashMap<>();

        for (InventoryMovement movement : movements) {
            if (movement.getRawMaterial() == null || movement.getRawMaterial().getId() == null) continue;
            Long key = movement.getRawMaterial().getId();
            movementCount.put(key, movementCount.getOrDefault(key, 0L) + 1);
            if ("CONSUMPTION".equalsIgnoreCase(movement.getMovementType())) {
                totalConsumed.put(key, totalConsumed.getOrDefault(key, 0d) + movement.getQuantity());
            } else if ("RESTOCK".equalsIgnoreCase(movement.getMovementType())) {
                totalRestocked.put(key, totalRestocked.getOrDefault(key, 0d) + movement.getQuantity());
            }
        }

        return rawMaterialRepository.findAll()
                .stream()
                .map(m -> Map.<String, Object>of(
                        "id", m.getId(),
                        "name", m.getName(),
                        "unit", m.getUnit(),
                        "currentStock", m.getQuantity(),
                        "reorderLevel", m.getReorderLevel(),
                        "totalConsumed", totalConsumed.getOrDefault(m.getId(), 0d),
                        "totalRestocked", totalRestocked.getOrDefault(m.getId(), 0d),
                        "movementCount", movementCount.getOrDefault(m.getId(), 0L)
                ))
                .collect(Collectors.toList());
    }

    @PostMapping("/purchase-orders")
    public ResponseEntity<?> createPurchaseOrder(@RequestBody Map<String, Object> payload) {
        try {
            Long materialId = Long.valueOf(String.valueOf(payload.get("materialId")));
            double quantity = Double.parseDouble(String.valueOf(payload.getOrDefault("quantity", 0)));
            if (quantity <= 0) {
                return ResponseEntity.badRequest().body(Map.of("message", "Quantity must be greater than 0"));
            }

            RawMaterial material = rawMaterialRepository.findById(materialId)
                    .orElseThrow(() -> new RuntimeException("Material not found"));

            InventoryPurchaseOrder po = new InventoryPurchaseOrder();
            po.setRawMaterial(material);
            po.setQuantity(quantity);
            po.setUnit(material.getUnit());
            po.setSupplier(String.valueOf(payload.getOrDefault("supplier", material.getSupplier())));
            po.setStatus("INITIATED");
            po.setCreatedAt(LocalDateTime.now());
            InventoryPurchaseOrder saved = inventoryPurchaseOrderRepository.save(po);

            return ResponseEntity.ok(Map.of(
                    "message", "Purchase order initiated",
                    "id", saved.getId()
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Unable to initiate purchase order"));
        }
    }

    @GetMapping("/purchase-orders")
    public List<Map<String, Object>> getPurchaseOrders() {
        return inventoryPurchaseOrderRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(po -> Map.<String, Object>of(
                        "id", po.getId(),
                        "material", po.getRawMaterial() != null ? po.getRawMaterial().getName() : "-",
                        "quantity", po.getQuantity(),
                        "unit", po.getUnit(),
                        "supplier", po.getSupplier(),
                        "status", po.getStatus(),
                        "createdAt", po.getCreatedAt()
                ))
                .collect(Collectors.toList());
    }

    private ResponseEntity<?> adjustStock(Long materialId, Map<String, Object> payload, String movementType) {
        try {
            RawMaterial material = rawMaterialRepository.findById(materialId)
                    .orElseThrow(() -> new RuntimeException("Material not found"));

            double quantity = Double.parseDouble(String.valueOf(payload.getOrDefault("quantity", 0)));
            if (quantity <= 0) {
                return ResponseEntity.badRequest().body(Map.of("message", "Quantity must be greater than 0"));
            }

            if ("CONSUMPTION".equals(movementType) && material.getQuantity() < quantity) {
                return ResponseEntity.badRequest().body(Map.of("message", "Insufficient stock"));
            }

            if ("RESTOCK".equals(movementType)) {
                material.setQuantity(material.getQuantity() + quantity);
            } else {
                material.setQuantity(material.getQuantity() - quantity);
            }
            material.setUpdatedAt(LocalDateTime.now());
            rawMaterialRepository.save(material);

            InventoryMovement movement = new InventoryMovement();
            movement.setRawMaterial(material);
            movement.setMovementType(movementType);
            movement.setQuantity(quantity);
            movement.setReferenceType(String.valueOf(payload.getOrDefault("referenceType", "MANUAL")));
            movement.setReferenceId(String.valueOf(payload.getOrDefault("referenceId", "")));
            movement.setNote(String.valueOf(payload.getOrDefault("note", "")));
            movement.setCreatedAt(LocalDateTime.now());
            inventoryMovementRepository.save(movement);

            return ResponseEntity.ok(Map.of(
                    "message", movementType + " successful",
                    "currentStock", material.getQuantity()
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Stock update failed"));
        }
    }

    private Map<String, Object> toMovementView(InventoryMovement m) {
        return Map.of(
                "id", m.getId(),
                "material", m.getRawMaterial() != null ? m.getRawMaterial().getName() : "-",
                "movementType", m.getMovementType(),
                "quantity", m.getQuantity(),
                "referenceType", m.getReferenceType(),
                "referenceId", m.getReferenceId() == null ? "" : m.getReferenceId(),
                "note", m.getNote() == null ? "" : m.getNote(),
                "createdAt", m.getCreatedAt()
        );
    }

    private LocalDateTime periodStart(String period) {
        LocalDate now = LocalDate.now();
        switch (period.toLowerCase()) {
            case "monthly":
                return now.with(TemporalAdjusters.firstDayOfMonth()).atStartOfDay();
            case "weekly":
                return now.minusDays(6).atStartOfDay();
            case "daily":
            default:
                return LocalDateTime.of(now, LocalTime.MIN);
        }
    }

    private void ensureDefaultMaterials() {
        List<Map<String, Object>> defaults = Arrays.asList(
                Map.of("name", "Cement", "unit", "kg", "supplier", "UltraTech", "price", 8.0d, "reorder", 1000d, "imageUrl", "https://images.unsplash.com/photo-1618397746666-63405ce5d015?auto=format&fit=crop&w=1200&q=80"),
                Map.of("name", "Sand", "unit", "kg", "supplier", "Local River Supply", "price", 2.5d, "reorder", 3000d, "imageUrl", "https://images.unsplash.com/photo-1508179522353-11ba468c4a1c?auto=format&fit=crop&w=1200&q=80"),
                Map.of("name", "Aggregates", "unit", "kg", "supplier", "Stone Crusher Plant", "price", 3.0d, "reorder", 5000d, "imageUrl", "https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=1200&q=80"),
                Map.of("name", "Admixtures", "unit", "litre", "supplier", "Fosroc", "price", 120.0d, "reorder", 300d, "imageUrl", "https://images.unsplash.com/photo-1581094271901-8022df4466f9?auto=format&fit=crop&w=1200&q=80"),
                Map.of("name", "Water", "unit", "litre", "supplier", "Plant Water Unit", "price", 0.5d, "reorder", 10000d, "imageUrl", "https://images.unsplash.com/photo-1495774539583-885e02cca8c2?auto=format&fit=crop&w=1200&q=80")
        );
        for (Map<String, Object> row : defaults) {
            RawMaterial material = new RawMaterial();
            material.setName(String.valueOf(row.get("name")));
            material.setQuantity(10);
            material.setReorderLevel((Double) row.get("reorder"));
            material.setSupplier(String.valueOf(row.get("supplier")));
            material.setUnit(String.valueOf(row.get("unit")));
            material.setPricePerUnit((Double) row.get("price"));
            material.setImageUrl(String.valueOf(row.get("imageUrl")));
            material.setUpdatedAt(LocalDateTime.now());
            rawMaterialRepository.save(material);
        }
    }

    private String defaultMaterialImage(String materialName) {
        if (materialName == null) {
            return "https://images.unsplash.com/photo-1618397746666-63405ce5d015?auto=format&fit=crop&w=1200&q=80";
        }
        String name = materialName.toLowerCase();
        if (name.contains("sand")) {
            return "https://images.unsplash.com/photo-1508179522353-11ba468c4a1c?auto=format&fit=crop&w=1200&q=80";
        }
        if (name.contains("aggregate")) {
            return "https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=1200&q=80";
        }
        if (name.contains("admixture")) {
            return "https://images.unsplash.com/photo-1581094271901-8022df4466f9?auto=format&fit=crop&w=1200&q=80";
        }
        if (name.contains("water")) {
            return "https://images.unsplash.com/photo-1495774539583-885e02cca8c2?auto=format&fit=crop&w=1200&q=80";
        }
        return "https://images.unsplash.com/photo-1618397746666-63405ce5d015?auto=format&fit=crop&w=1200&q=80";
    }

    private double defaultMaterialPrice(String materialName) {
        if (materialName == null) return 1.0d;
        String name = materialName.toLowerCase();
        if (name.contains("cement")) return 8.0d;
        if (name.contains("sand")) return 2.5d;
        if (name.contains("aggregate")) return 3.0d;
        if (name.contains("admixture")) return 120.0d;
        if (name.contains("water")) return 0.5d;
        return 10.0d;
    }
}
