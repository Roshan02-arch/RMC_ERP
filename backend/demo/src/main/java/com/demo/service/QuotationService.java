package com.demo.service;

import com.demo.dto.QuotationRequest;
import com.demo.dto.QuotationResponse;

import java.util.List;

public interface QuotationService {
    QuotationResponse create(QuotationRequest request);
    List<QuotationResponse> list();
    QuotationResponse getById(Long id);
    QuotationResponse update(Long id, QuotationRequest request);
    void delete(Long id);
}
