package com.demo.controller;

import com.demo.dto.QuotationRequest;
import com.demo.service.QuotationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/quotation")
@CrossOrigin("*")
public class CustomerQuotationController {

    @Autowired
    private QuotationService quotationService;

    @PostMapping("/request")
    public ResponseEntity<?> createRequest(@RequestBody QuotationRequest request) {
        try {
            Long userId = request.getCustomerUserId();
            return ResponseEntity.ok(Map.of(
                    "message", "Quotation Request Sent Successfully",
                    "data", quotationService.createCustomerRequest(userId, request)
            ));
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/my/{userId}")
    public ResponseEntity<?> listMyRequests(@PathVariable Long userId) {
        try {
            return ResponseEntity.ok(quotationService.listByCustomer(userId));
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/request/{id}")
    public ResponseEntity<?> updatePendingRequest(
            @PathVariable Long id,
            @RequestParam Long userId,
            @RequestBody QuotationRequest request
    ) {
        try {
            return ResponseEntity.ok(Map.of(
                    "message", "Quotation request updated successfully",
                    "data", quotationService.updateCustomerRequest(id, userId, request)
            ));
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/{id}/decision")
    public ResponseEntity<?> customerDecision(
            @PathVariable Long id,
            @RequestParam Long userId,
            @RequestParam String action
    ) {
        try {
            return ResponseEntity.ok(Map.of(
                    "message", "Quotation response submitted successfully",
                    "data", quotationService.customerDecision(id, userId, action)
            ));
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/{id}/reviewed")
    public ResponseEntity<?> markReviewed(
            @PathVariable Long id,
            @RequestParam Long userId
    ) {
        try {
            return ResponseEntity.ok(Map.of(
                    "message", "Quotation marked as reviewed",
                    "data", quotationService.markCustomerReviewed(id, userId)
            ));
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }
}
