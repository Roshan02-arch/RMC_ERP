package com.demo.repository;

import com.demo.entity.PaymentRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PaymentRecordRepository extends JpaRepository<PaymentRecord, Long> {
    List<PaymentRecord> findByOrder_OrderIdOrderByPaidAtDesc(String orderId);
}
