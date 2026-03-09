package com.demo.controller;

import com.demo.entity.ConcreteProductStock;
import com.demo.repository.ConcreteProductStockRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@CrossOrigin("*")
public class ProductStockController {

    @Autowired
    private ConcreteProductStockRepository productRepository;

    @GetMapping("/api/inventory/products")
    public List<Map<String, Object>> getProductsForCustomer() {
        ensureDefaultProducts();
        return productRepository.findAll().stream()
                .map(this::toView)
                .collect(Collectors.toList());
    }

    @GetMapping("/api/admin/inventory/products")
    public List<Map<String, Object>> getProductsForAdmin() {
        ensureDefaultProducts();
        return productRepository.findAll().stream()
                .map(this::toView)
                .collect(Collectors.toList());
    }

    @PostMapping("/api/admin/inventory/products")
    public ResponseEntity<?> createProduct(@RequestBody Map<String, Object> payload) {
        try {
            String name = String.valueOf(payload.getOrDefault("name", "")).trim();
            double price = Double.parseDouble(String.valueOf(payload.getOrDefault("pricePerUnit", 0)));
            double stock = Double.parseDouble(String.valueOf(payload.getOrDefault("availableQuantity", 0)));
            String unit = String.valueOf(payload.getOrDefault("unit", "m3")).trim();
            String imageUrl = String.valueOf(payload.getOrDefault("imageUrl", "")).trim();
            if (name.isEmpty() || price <= 0 || stock < 0 || unit.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Invalid product details"));
            }
            if (productRepository.findByNameIgnoreCase(name).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Product already exists"));
            }

            ConcreteProductStock product = new ConcreteProductStock();
            product.setName(name);
            product.setPricePerUnit(price);
            product.setAvailableQuantity(stock);
            product.setUnit(unit);
            product.setImageUrl(imageUrl.isEmpty() ? defaultProductImage(name) : imageUrl);
            product.setCreatedAt(LocalDateTime.now());
            product.setUpdatedAt(LocalDateTime.now());
            productRepository.save(product);
            return ResponseEntity.ok(Map.of("message", "Product added successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Unable to add product"));
        }
    }

    @PostMapping("/api/admin/inventory/products/{id}/restock")
    public ResponseEntity<?> restockProduct(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            double qty = Double.parseDouble(String.valueOf(payload.getOrDefault("quantity", 0)));
            if (qty <= 0) {
                return ResponseEntity.badRequest().body(Map.of("message", "Quantity must be greater than 0"));
            }

            ConcreteProductStock product = productRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Product not found"));
            product.setAvailableQuantity(product.getAvailableQuantity() + qty);
            product.setUpdatedAt(LocalDateTime.now());
            productRepository.save(product);

            return ResponseEntity.ok(Map.of(
                    "message", "Restocked successfully",
                    "stock", product.getAvailableQuantity()
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Unable to restock product"));
        }
    }

    @DeleteMapping({"/api/admin/inventory/products/{id}", "/api/inventory/products/{id}"})
    public ResponseEntity<?> deleteProduct(@PathVariable Long id) {
        return performDeleteProduct(id);
    }

    // Compatibility endpoint in case DELETE is blocked by proxy/browser setup.
    @PostMapping("/api/admin/inventory/products/{id}/delete")
    public ResponseEntity<?> deleteProductViaPost(@PathVariable Long id) {
        return performDeleteProduct(id);
    }

    private ResponseEntity<?> performDeleteProduct(Long id) {
        try {
            if (!productRepository.existsById(id)) {
                return ResponseEntity.status(404).body(Map.of("message", "Product not found"));
            }
            productRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Product deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "message", "Unable to delete product",
                    "error", e.getMessage() == null ? "" : e.getMessage()
            ));
        }
    }

    private Map<String, Object> toView(ConcreteProductStock p) {
        return Map.of(
                "id", p.getId(),
                "name", p.getName(),
                "pricePerUnit", p.getPricePerUnit(),
                "availableQuantity", p.getAvailableQuantity(),
                "unit", p.getUnit(),
                "imageUrl", p.getImageUrl() == null ? "" : p.getImageUrl(),
                "createdAt", p.getCreatedAt(),
                "updatedAt", p.getUpdatedAt()
        );
    }

    private void ensureDefaultProducts() {
        if (productRepository.count() > 0) {
            return;
        }

        List<Map<String, Object>> defaults = Arrays.asList(
                Map.of("name", "M10", "price", 4200d, "stock", 120d, "imageUrl", "https://images.unsplash.com/photo-1599707367072-cd6ada2bc375?auto=format&fit=crop&w=1200&q=80"),
                Map.of("name", "M15", "price", 4600d, "stock", 120d, "imageUrl", "https://images.unsplash.com/photo-1599707254554-027aeb4deacd?auto=format&fit=crop&w=1200&q=80"),
                Map.of("name", "M20", "price", 5000d, "stock", 120d, "imageUrl", "https://images.unsplash.com/photo-1617098474202-0d0d7f60f7aa?auto=format&fit=crop&w=1200&q=80"),
                Map.of("name", "M25", "price", 5500d, "stock", 100d, "imageUrl", "https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&w=1200&q=80"),
                Map.of("name", "M30", "price", 6000d, "stock", 90d, "imageUrl", "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80"),
                Map.of("name", "M35", "price", 6500d, "stock", 80d, "imageUrl", "https://images.unsplash.com/photo-1485083269755-a7b559a4fe5e?auto=format&fit=crop&w=1200&q=80"),
                Map.of("name", "M40", "price", 7200d, "stock", 70d, "imageUrl", "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80"),
                Map.of("name", "M45", "price", 7700d, "stock", 60d, "imageUrl", "https://images.unsplash.com/photo-1590247813693-5541d1c609fd?auto=format&fit=crop&w=1200&q=80"),
                Map.of("name", "M50", "price", 8300d, "stock", 50d, "imageUrl", "https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&w=1200&q=80"),
                Map.of("name", "Self Compacting Concrete", "price", 9000d, "stock", 35d, "imageUrl", "https://images.unsplash.com/photo-1523419409543-a5e549c1f79b?auto=format&fit=crop&w=1200&q=80"),
                Map.of("name", "Fiber Reinforced Concrete", "price", 9400d, "stock", 30d, "imageUrl", "https://images.unsplash.com/photo-1590650516494-0c8d6f7b0a5f?auto=format&fit=crop&w=1200&q=80"),
                Map.of("name", "Rapid Setting Concrete", "price", 9800d, "stock", 25d, "imageUrl", "https://images.unsplash.com/photo-1429497419816-9ca5cfb4571a?auto=format&fit=crop&w=1200&q=80"),
                Map.of("name", "PQC Concrete M40", "price", 8600d, "stock", 40d, "imageUrl", "https://images.unsplash.com/photo-1531834685032-c34bf0d84c77?auto=format&fit=crop&w=1200&q=80"),
                Map.of("name", "Waterproof Concrete", "price", 9100d, "stock", 30d, "imageUrl", "https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1200&q=80")
        );

        for (Map<String, Object> row : defaults) {
            String name = String.valueOf(row.get("name"));
            Optional<ConcreteProductStock> existing = productRepository.findByNameIgnoreCase(name);
            if (existing.isPresent()) {
                ConcreteProductStock product = existing.get();
                if (product.getImageUrl() == null || product.getImageUrl().isBlank()) {
                    product.setImageUrl(String.valueOf(row.get("imageUrl")));
                }
                if (product.getAvailableQuantity() <= 0) {
                    product.setAvailableQuantity(10);
                }
                product.setUpdatedAt(LocalDateTime.now());
                productRepository.save(product);
                continue;
            }

            ConcreteProductStock product = new ConcreteProductStock();
            product.setName(name);
            product.setPricePerUnit((Double) row.get("price"));
            product.setAvailableQuantity((Double) row.get("stock"));
            product.setUnit("m3");
            product.setImageUrl(String.valueOf(row.get("imageUrl")));
            product.setCreatedAt(LocalDateTime.now());
            product.setUpdatedAt(LocalDateTime.now());
            productRepository.save(product);
        }
    }

    private String defaultProductImage(String productName) {
        String name = productName == null ? "" : productName.toLowerCase();
        if (name.matches("^m\\d{2}$")) {
            return "https://images.unsplash.com/photo-1599707367072-cd6ada2bc375?auto=format&fit=crop&w=1200&q=80";
        }
        if (name.contains("pqc")) {
            return "https://images.unsplash.com/photo-1531834685032-c34bf0d84c77?auto=format&fit=crop&w=1200&q=80";
        }
        if (name.contains("self compacting") || name.contains("fiber") || name.contains("rapid") || name.contains("waterproof")) {
            return "https://images.unsplash.com/photo-1523419409543-a5e549c1f79b?auto=format&fit=crop&w=1200&q=80";
        }
        return "https://images.unsplash.com/photo-1599707367072-cd6ada2bc375?auto=format&fit=crop&w=1200&q=80";
    }
}
