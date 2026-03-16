package com.demo.controller;

import com.demo.dto.QuotationRequest;
import com.demo.service.QuotationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/quotation")
@CrossOrigin("*")
public class QuotationController {

    @Autowired
    private QuotationService quotationService;

    @PostMapping("/create")
    public ResponseEntity<?> create(@RequestBody QuotationRequest request) {
        try {
            return ResponseEntity.ok(Map.of(
                    "message", "Quotation created successfully",
                    "data", quotationService.create(request)
            ));
        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/list")
    public ResponseEntity<?> list() {
        return ResponseEntity.ok(quotationService.list());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(quotationService.getById(id));
        } catch (RuntimeException ex) {
            return ResponseEntity.status(404).body(Map.of("message", ex.getMessage()));
        }
    }

    @PutMapping("/update/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody QuotationRequest request) {
        try {
            return ResponseEntity.ok(Map.of(
                    "message", "Quotation updated successfully",
                    "data", quotationService.update(id, request)
            ));
        } catch (RuntimeException ex) {
            String message = ex.getMessage() == null ? "Unable to update quotation" : ex.getMessage();
            int status = "Quotation not found".equals(message) ? 404 : 400;
            return ResponseEntity.status(status).body(Map.of("message", message));
        }
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            quotationService.delete(id);
            return ResponseEntity.ok(Map.of("message", "Quotation deleted successfully"));
        } catch (RuntimeException ex) {
            return ResponseEntity.status(404).body(Map.of("message", ex.getMessage()));
        }
    }
}
