package com.demo.repository;

import com.demo.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;

public interface UserRepository extends JpaRepository<User, Long> {

    // 🔍 Find by email (used in login / registration)
    Optional<User> findByEmail(String email);
    Optional<User> findByNumber(String number);

    // 🔍 Find users by role (ADMIN / CUSTOMER)
    List<User> findByRole(String role);

    // 🔍 Find users by approval status
    List<User> findByApprovalStatus(String approvalStatus);

    // 🔍 Find by role and approval status (used in admin approval logic)
    List<User> findByRoleAndApprovalStatus(String role, String approvalStatus);

    Optional<User> findByEmailAndResetOtp(String email, String resetOtp);
}
