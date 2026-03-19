package com.demo.repository;

import com.demo.entity.Quotation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QuotationRepository extends JpaRepository<Quotation, Long> {
    Optional<Quotation> findByQuotationNumber(String quotationNumber);
    Optional<Quotation> findByRequestId(String requestId);
    List<Quotation> findAllByOrderByDateDescIdDesc();
    List<Quotation> findByCustomerUserIdOrderByCreatedAtDesc(Long customerUserId);
    List<Quotation> findByCustomerUserIdAndStatusInOrderByCreatedAtDesc(Long customerUserId, List<String> statuses);
    List<Quotation> findByStatusInOrderByCreatedAtDesc(List<String> statuses);
}
