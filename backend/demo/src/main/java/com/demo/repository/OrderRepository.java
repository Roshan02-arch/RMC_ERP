package com.demo.repository;

import com.demo.entity.Order;
import com.demo.entity.OrderStatus;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    Optional<Order> findByOrderId(String orderId);

    List<Order> findByStatus(OrderStatus status);

    // ✅ ADD THIS
    List<Order> findByUser_Id(Long userId);

    @Transactional
    @Modifying
    @Query("DELETE FROM Order o WHERE o.orderId = :orderId")
    int deleteByOrderId(@Param("orderId") String orderId);
}
