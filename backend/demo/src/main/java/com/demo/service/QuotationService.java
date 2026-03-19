package com.demo.service;

import com.demo.dto.QuotationRequest;
import com.demo.dto.QuotationResponse;

import java.util.List;

public interface QuotationService {
    QuotationResponse create(QuotationRequest request);
    List<QuotationResponse> list();
    List<QuotationResponse> listRequestsForAdmin();
    List<QuotationResponse> listByCustomer(Long userId);
    QuotationResponse getById(Long id);
    QuotationResponse update(Long id, QuotationRequest request);
    QuotationResponse createCustomerRequest(Long userId, QuotationRequest request);
    QuotationResponse updateCustomerRequest(Long id, Long userId, QuotationRequest request);
    QuotationResponse approveRequest(Long id, Long adminUserId);
    QuotationResponse rejectRequest(Long id, Long adminUserId, String reason);
    QuotationResponse sendQuotation(Long id, Long adminUserId, QuotationRequest request);
    QuotationResponse markCustomerReviewed(Long id, Long userId);
    QuotationResponse customerDecision(Long id, Long userId, String action);
    void delete(Long id);
}
