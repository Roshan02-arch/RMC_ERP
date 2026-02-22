package com.demo.controller;

import java.util.Map;
import java.util.Optional;
import com.demo.dto.LoginRequest;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

            // 🔹 Manual duplicate check
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
    @GetMapping("/ping")
    public String ping() {
        return "WORKING";
    }
}