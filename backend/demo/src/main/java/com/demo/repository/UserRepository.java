package com.demo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.demo.entity.User;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    // Already existing
    boolean existsByEmail(String email);

    boolean existsByNumber(String number);

    Optional<User> findByEmail(String email);

    // 🔐 Add this for Forgot Password
    Optional<User> findByResetToken(String resetToken);
}