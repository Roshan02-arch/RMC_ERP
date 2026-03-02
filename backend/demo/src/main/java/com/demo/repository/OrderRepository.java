package com.demo.repository;

import com.demo.entity.Order;
import com.demo.entity.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    Optional<Order> findByOrderId(String orderId);

    List<Order> findByStatus(OrderStatus status);

    List<Order> findByUserId(Long userId);

    int deleteByOrderId(String orderId);
}