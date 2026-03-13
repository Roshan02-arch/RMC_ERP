package com.demo.repository;

import com.demo.entity.OrderApprovalHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderApprovalHistoryRepository extends JpaRepository<OrderApprovalHistory, Long> {

    List<OrderApprovalHistory> findByOrderIdOrderByActionTimeDesc(String orderId);
}
