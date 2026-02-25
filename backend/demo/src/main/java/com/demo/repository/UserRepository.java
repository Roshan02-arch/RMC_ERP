package com.demo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.demo.entity.User;
import java.util.Optional;
import java.util.List;

public interface UserRepository extends JpaRepository<User, Long> {

    boolean existsByEmail(String email);

    boolean existsByNumber(String number);

    Optional<User> findByEmail(String email);

    List<User> findByRole(String role);

    List<User> findByRoleAndApprovalStatus(String role, String approvalStatus);
}
