package com.demo.controller;

import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.demo.entity.User;
import com.demo.repository.UserRepository;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody User user) {

        try {

            if (userRepository.existsByEmail(user.getEmail()) ||
                    userRepository.existsByNumber(user.getNumber())) {

                return ResponseEntity.badRequest()
                        .body(Map.of("message", "User already exists"));
            }

            String requestedRole = user.getRole() == null ? "CUSTOMER" : user.getRole().toUpperCase();
            if (!"ADMIN".equals(requestedRole) && !"CUSTOMER".equals(requestedRole)) {
                requestedRole = "CUSTOMER";
            }

            user.setRole(requestedRole);
            if ("ADMIN".equals(requestedRole)) {
                user.setApprovalStatus("PENDING_APPROVAL");
            } else {
                user.setApprovalStatus("APPROVED");
            }
            userRepository.save(user);

            return ResponseEntity.ok(
                    Map.of(
                            "message",
                            "ADMIN".equals(requestedRole)
                                    ? "Admin account created. Waiting for approval."
                                    : "User registered successfully!"
                    ));

        } catch (DataIntegrityViolationException ex) {

            return ResponseEntity.badRequest()
                    .body(Map.of("message", "User already exists"));

        } catch (Exception ex) {

            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Something went wrong"));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody User loginRequest) {

        User user = userRepository.findByEmail(loginRequest.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!user.getPassword().equals(loginRequest.getPassword())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Invalid credentials"));
        }

        String role = user.getRole() != null ? user.getRole() : "CUSTOMER";
        String approvalStatus = user.getApprovalStatus() == null ? "APPROVED" : user.getApprovalStatus();

        if ("ADMIN".equals(role) && !"APPROVED".equals(approvalStatus)) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Admin account is pending approval"));
        }

        return ResponseEntity.ok(
                Map.of(
                        "message", "Login successful",
                        "role", role,
                        "userId", user.getId(),
                        "name", user.getName() == null ? "" : user.getName(),
                        "email", user.getEmail() == null ? "" : user.getEmail(),
                        "number", user.getNumber() == null ? "" : user.getNumber(),
                        "address", user.getAddress() == null ? "" : user.getAddress(),
                        "approvalStatus", approvalStatus));
    }

    @GetMapping("/ping")
    public String ping() {
        return "WORKING";
    }

    @PostMapping("/admin/login")
    public ResponseEntity<?> adminLogin(@RequestBody User loginRequest) {

        User user = userRepository.findByEmail(loginRequest.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!user.getPassword().equals(loginRequest.getPassword())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Invalid credentials"));
        }

        if (!"ADMIN".equals(user.getRole())) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Access denied. Not an admin."));
        }

        String approvalStatus = user.getApprovalStatus() == null ? "APPROVED" : user.getApprovalStatus();
        if (!"APPROVED".equals(approvalStatus)) {
            return ResponseEntity.status(403)
                    .body(Map.of("message", "Admin account is pending approval"));
        }

        return ResponseEntity.ok(Map.of(
                "message", "Admin login successful",
                "adminId", user.getId(),
                "role", user.getRole()));
    }

    @GetMapping("/{userId}/profile")
    public ResponseEntity<?> getUserProfile(@PathVariable Long userId) {
        Optional<User> userOptional = userRepository.findById(userId);

        if (userOptional.isEmpty()) {
            return ResponseEntity.status(404)
                    .body(Map.of("message", "User not found"));
        }

        User user = userOptional.get();
        return ResponseEntity.ok(Map.of(
                "id", user.getId(),
                "name", user.getName() == null ? "" : user.getName(),
                "email", user.getEmail() == null ? "" : user.getEmail(),
                "number", user.getNumber() == null ? "" : user.getNumber(),
                "address", user.getAddress() == null ? "" : user.getAddress()));
    }

    @PutMapping("/{userId}/profile")
    public ResponseEntity<?> updateUserProfile(@PathVariable Long userId, @RequestBody Map<String, String> payload) {
        Optional<User> userOptional = userRepository.findById(userId);

        if (userOptional.isEmpty()) {
            return ResponseEntity.status(404)
                    .body(Map.of("message", "User not found"));
        }

        User user = userOptional.get();
        String address = payload.getOrDefault("address", "").trim();
        user.setAddress(address);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "message", "Profile updated successfully",
                "address", user.getAddress()));
    }
}
