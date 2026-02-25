package com.demo.controller;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import com.demo.dto.LoginRequest;
import com.demo.entity.User;
import com.demo.repository.UserRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired(required = false) // 🔥 Prevent crash if mail not configured
    private JavaMailSender mailSender;

    // ================= REGISTER =================
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody User user) {
        try {

            if (userRepository.existsByEmail(user.getEmail()) ||
                    userRepository.existsByNumber(user.getNumber())) {

                return ResponseEntity.badRequest()
                        .body(Map.of("message", "User already exists"));
            }

            userRepository.save(user);

            return ResponseEntity.ok(
                    Map.of("message", "User registered successfully!")
            );

        } catch (DataIntegrityViolationException ex) {

            return ResponseEntity.badRequest()
                    .body(Map.of("message", "User already exists"));

        } catch (Exception ex) {

            return ResponseEntity.internalServerError()
                    .body(Map.of("message", "Something went wrong"));
        }
    }

    // ================= LOGIN =================
    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody LoginRequest request) {

        Optional<User> user = userRepository.findByEmail(request.getEmail());

        if (user.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "User not found"));
        }

        if (!user.get().getPassword().equals(request.getPassword())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Invalid password"));
        }

        return ResponseEntity.ok(
                Map.of("message", "Login successful")
        );
    }

    // ================= FORGOT PASSWORD =================
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestParam String email) {

        Optional<User> userOptional = userRepository.findByEmail(email);

        // 🔐 Security: do not reveal email existence
        if (userOptional.isEmpty()) {
            return ResponseEntity.ok(
                    Map.of("message",
                            "If this email is registered, a reset link has been sent.")
            );
        }

        User user = userOptional.get();

        String token = UUID.randomUUID().toString();

        user.setResetToken(token);
        user.setTokenExpiry(LocalDateTime.now().plusMinutes(15));
        userRepository.save(user);

        // 🔥 Make sure this matches your Vite port
        String resetLink = "http://192.168.1.24:5177/reset-password/" + token;
        // 📩 Send email safely (non-blocking + no crash)
        if (mailSender != null) {

            new Thread(() -> {
                try {
                    SimpleMailMessage message = new SimpleMailMessage();
                    message.setTo(email);
                    message.setSubject("Reset Password - RMC ERP");
                    message.setText(
                            "Hello,\n\n"
                                    + "Click the link below to reset your password:\n\n"
                                    + resetLink
                                    + "\n\nThis link will expire in 15 minutes."
                    );

                    mailSender.send(message);

                } catch (Exception e) {
                    // 🔥 Do not crash app if mail fails
                    System.out.println("Mail sending failed: " + e.getMessage());
                }
            }).start();
        }

        return ResponseEntity.ok(
                Map.of("message",
                        "If this email is registered, a reset link has been sent.")
        );
    }

    // ================= RESET PASSWORD =================
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {

        String token = request.get("token");
        String newPassword = request.get("newPassword");

        if (token == null || newPassword == null || newPassword.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message",
                            "Token and new password are required"));
        }

        Optional<User> userOptional = userRepository.findByResetToken(token);

        if (userOptional.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Invalid token"));
        }

        User user = userOptional.get();

        // 🔥 Prevent 500 error
        if (user.getTokenExpiry() == null ||
                user.getTokenExpiry().isBefore(LocalDateTime.now())) {

            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Token expired"));
        }

        user.setPassword(newPassword);
        user.setResetToken(null);
        user.setTokenExpiry(null);

        userRepository.save(user);

        return ResponseEntity.ok(
                Map.of("message", "Password updated successfully")
        );
    }

    @GetMapping("/ping")
    public String ping() {
        return "WORKING";
    }
}