package com.demo.repository;

import com.demo.entity.NotificationType;
import com.demo.entity.OrderNotification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrderNotificationRepository extends JpaRepository<OrderNotification, Long> {
    List<OrderNotification> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<OrderNotification> findByUserIdAndIsReadFalseOrderByCreatedAtDesc(Long userId);

    long countByUserIdAndIsReadFalse(Long userId);

    Optional<OrderNotification> findByIdAndUserId(Long id, Long userId);

    Optional<OrderNotification> findTopByUserIdAndOrderIdAndTypeOrderByCreatedAtDesc(
            Long userId,
            String orderId,
            NotificationType type
    );
}
