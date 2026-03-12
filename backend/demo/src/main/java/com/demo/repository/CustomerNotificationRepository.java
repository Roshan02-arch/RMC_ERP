package com.demo.repository;

import com.demo.entity.CustomerNotification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CustomerNotificationRepository extends JpaRepository<CustomerNotification, Long> {
    List<CustomerNotification> findByUser_IdAndDeletedFalseOrderByCreatedAtDesc(Long userId);
    List<CustomerNotification> findByUser_IdAndDeletedFalseAndReadFalseOrderByCreatedAtDesc(Long userId);
    Optional<CustomerNotification> findByIdAndUser_Id(Long id, Long userId);
    boolean existsByUser_IdAndReminderKey(Long userId, String reminderKey);
}
