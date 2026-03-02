package com.demo.controller;

import com.demo.dto.ForgotPasswordRequest;
import com.demo.dto.ResetPasswordRequest;
import com.demo.dto.UpdateProfileRequest;
import com.demo.dto.VerifyOtpRequest;
import com.demo.entity.User;
import com.demo.repository.UserRepository;
import com.demo.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@CrossOrigin("*")
public class UserController {

    @Autowired
    private UserService userService;
    @Autowired
    private UserRepository userRepository;

    // GET ALL
    @GetMapping
    public List<User> getAllUsers() {
        return userService.getAllUsers();
    }

    // GET BY ID
    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(userService.getUserById(id));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{userId}/profile")
    public ResponseEntity<?> getUserProfile(@PathVariable Long userId) {
        try {
            User user = userService.getUserById(userId);
            Map<String, Object> response = new HashMap<>();
            response.put("id", user.getId());
            response.put("name", user.getName());
            response.put("email", user.getEmail());
            response.put("number", user.getNumber());
            response.put("address", user.getAddress());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(404)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // CREATE
    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody User user) {
        try {
            User savedUser = userService.createUser(user);
            return ResponseEntity.ok(Map.of(
                    "message", "User created successfully",
                    "userId", savedUser.getId()
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        return createUser(user);
    }
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginRequest) {

        User user = userService.getByEmail(loginRequest.getEmail());

        if (user == null || !user.getPassword().equals(loginRequest.getPassword())) {
            return ResponseEntity.status(401)
                    .body(Map.of("message", "Invalid email or password"));
        }

        if ("ADMIN".equalsIgnoreCase(user.getRole())
                && !"APPROVED".equalsIgnoreCase(user.getApprovalStatus())) {

            return ResponseEntity.status(403)
                    .body(Map.of("message", "Admin approval pending"));
        }

        Map<String, Object> response = new java.util.HashMap<>();
        response.put("message", "Login successful");
        response.put("role", user.getRole());
        response.put("userId", user.getId());
        response.put("name", user.getName());
        response.put("email", user.getEmail());
        response.put("number", user.getNumber());   // can be null safely
        response.put("address", user.getAddress()); // can be null safely

        return ResponseEntity.ok(response);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        try {
            userService.sendResetOtp(request.getEmail());
            return ResponseEntity.ok(Map.of(
                    "message", "Verification code sent to your email",
                    "email", request.getEmail()
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/verify-reset-otp")
    public ResponseEntity<?> verifyResetOtp(@RequestBody VerifyOtpRequest request) {
        try {
            userService.verifyResetOtp(request.getEmail(), request.getOtp());
            return ResponseEntity.ok(Map.of("message", "Code verified"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest request) {
        try {
            userService.resetPasswordWithOtp(
                    request.getEmail(),
                    request.getOtp(),
                    request.getNewPassword()
            );
            return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{userId}/profile")
    public ResponseEntity<?> updateProfile(
            @PathVariable Long userId,
            @RequestBody UpdateProfileRequest request) {

        if (isBlank(request.getName()) || isBlank(request.getEmail()) || isBlank(request.getNumber())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Name, email and number are required"));
        }

        User user;
        try {
            user = userService.getUserById(userId);
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }

        String normalizedName = request.getName().trim();
        String normalizedEmail = request.getEmail().trim();
        String normalizedNumber = request.getNumber().trim();
        String normalizedAddress = request.getAddress() == null ? null : request.getAddress().trim();

        if (!normalizedEmail.equalsIgnoreCase(user.getEmail())) {
            if (userRepository.findByEmail(normalizedEmail).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Email already exists"));
            }
        }

        String currentNumber = user.getNumber() == null ? "" : user.getNumber();
        if (!normalizedNumber.equals(currentNumber)) {
            if (userRepository.findByNumber(normalizedNumber).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Mobile number already exists"));
            }
        }

        user.setName(normalizedName);
        user.setEmail(normalizedEmail);
        user.setNumber(normalizedNumber);
        user.setAddress(normalizedAddress);
        userRepository.saveAndFlush(user);

        return ResponseEntity.ok(Map.of("message", "Profile updated successfully"));
    }

    // UPDATE
    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(
            @PathVariable Long id,
            @RequestBody User user) {

        try {
            userService.updateUser(id, user);
            return ResponseEntity.ok(Map.of(
                    "message", "User updated successfully"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    // DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        try {
            userService.deleteUser(id);
            return ResponseEntity.ok(Map.of(
                    "message", "User deleted successfully"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404)
                    .body(Map.of("message", e.getMessage()));
        }
    }

}

