package com.demo.controller;

import com.demo.entity.OrderAssignment;
import com.demo.service.OrderAssignmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/assignments")
@CrossOrigin("*")
public class OrderAssignmentController {

    @Autowired
    private OrderAssignmentService service;

    // GET ALL
    @GetMapping
    public List<OrderAssignment> getAllAssignments() {
        return service.getAllAssignments();
    }

    // GET BY ID
    @GetMapping("/{id}")
    public ResponseEntity<?> getAssignmentById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(service.getAssignmentById(id));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // GET BY ORDER ID
    @GetMapping("/order/{orderId}")
    public ResponseEntity<?> getAssignmentByOrderId(@PathVariable Long orderId) {
        try {
            return ResponseEntity.ok(service.getAssignmentByOrderId(orderId));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // CREATE
    @PostMapping
    public ResponseEntity<?> createAssignment(@RequestBody OrderAssignment assignment) {
        OrderAssignment saved = service.createAssignment(assignment);

        return ResponseEntity.ok(Map.of(
                "message", "Assignment created successfully",
                "assignmentId", saved.getId()
        ));
    }

    // UPDATE
    @PutMapping("/{id}")
    public ResponseEntity<?> updateAssignment(
            @PathVariable Long id,
            @RequestBody OrderAssignment assignment) {

        try {
            service.updateAssignment(id, assignment);
            return ResponseEntity.ok(Map.of(
                    "message", "Assignment updated successfully"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAssignment(@PathVariable Long id) {
        try {
            service.deleteAssignment(id);
            return ResponseEntity.ok(Map.of(
                    "message", "Assignment deleted successfully"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404)
                    .body(Map.of("message", e.getMessage()));
        }
    }
}