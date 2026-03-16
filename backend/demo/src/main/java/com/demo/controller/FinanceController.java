package com.demo.controller;

import com.demo.entity.User;
import com.demo.repository.UserRepository;
import com.demo.service.AdminFinanceProductPricingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/finance")
@CrossOrigin("*")
public class FinanceController {

    @Autowired
    private AdminFinanceProductPricingService adminFinanceProductPricingService;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/product-pricing/options")
    public ResponseEntity<?> getProductPricingOptions(@RequestParam(required = false) Long adminUserId) {
        ResponseEntity<?> adminValidation = validateAdmin(adminUserId);
        if (adminValidation != null) {
            return adminValidation;
        }
        return ResponseEntity.ok(adminFinanceProductPricingService.getProductOptions());
    }

    @GetMapping("/product-pricing/details")
    public ResponseEntity<?> getProductPricingDetails(
            @RequestParam(required = false) Long adminUserId,
            @RequestParam String productName
    ) {
        ResponseEntity<?> adminValidation = validateAdmin(adminUserId);
        if (adminValidation != null) {
            return adminValidation;
        }
        try {
            return ResponseEntity.ok(adminFinanceProductPricingService.getProductPricingDetails(productName));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
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
}
