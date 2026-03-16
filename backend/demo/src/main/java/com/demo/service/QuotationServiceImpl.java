package com.demo.service;

import com.demo.dto.QuotationItemRequest;
import com.demo.dto.QuotationItemResponse;
import com.demo.dto.QuotationRequest;
import com.demo.dto.QuotationResponse;
import com.demo.entity.Quotation;
import com.demo.entity.QuotationItem;
import com.demo.repository.QuotationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class QuotationServiceImpl implements QuotationService {

    @Autowired
    private QuotationRepository quotationRepository;

    @Override
    @Transactional
    public QuotationResponse create(QuotationRequest request) {
        String quotationNumber = normalize(request.getQuotationNumber());
        if (quotationNumber.isEmpty()) {
            throw new RuntimeException("quotationNumber is required");
        }
        if (quotationRepository.findByQuotationNumber(quotationNumber).isPresent()) {
            throw new RuntimeException("Quotation number already exists");
        }

        Quotation quotation = new Quotation();
        applyRequest(quotation, request, true);
        Quotation saved = quotationRepository.save(quotation);
        return toResponse(saved);
    }

    @Override
    public List<QuotationResponse> list() {
        List<QuotationResponse> response = new ArrayList<>();
        for (Quotation quotation : quotationRepository.findAllByOrderByDateDescIdDesc()) {
            response.add(toResponse(quotation));
        }
        return response;
    }

    @Override
    public QuotationResponse getById(Long id) {
        Quotation quotation = quotationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Quotation not found"));
        return toResponse(quotation);
    }

    @Override
    @Transactional
    public QuotationResponse update(Long id, QuotationRequest request) {
        Quotation quotation = quotationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Quotation not found"));
        applyRequest(quotation, request, false);
        Quotation saved = quotationRepository.save(quotation);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!quotationRepository.existsById(id)) {
            throw new RuntimeException("Quotation not found");
        }
        quotationRepository.deleteById(id);
    }

    private void applyRequest(Quotation quotation, QuotationRequest request, boolean validateUniqueQuotationNumber) {
        String quotationNumber = normalize(request.getQuotationNumber());
        String customerName = normalize(request.getCustomerName());

        if (quotationNumber.isEmpty()) {
            throw new RuntimeException("quotationNumber is required");
        }
        if (customerName.isEmpty()) {
            throw new RuntimeException("customerName is required");
        }
        if (!validateUniqueQuotationNumber) {
            String existingNumber = normalize(quotation.getQuotationNumber());
            if (!existingNumber.equals(quotationNumber)
                    && quotationRepository.findByQuotationNumber(quotationNumber).isPresent()) {
                throw new RuntimeException("Quotation number already exists");
            }
        }

        quotation.setQuotationNumber(quotationNumber);
        quotation.setCustomerName(customerName);
        quotation.setDate(request.getDate() == null ? LocalDate.now() : request.getDate());
        quotation.setAddress(normalize(request.getAddress()));
        quotation.setContact(normalize(request.getContact()));
        quotation.setGstNo(normalize(request.getGstNo()));
        quotation.setSiteName(normalize(request.getSiteName()));
        quotation.setContactPerson(normalize(request.getContactPerson()));

        List<QuotationItem> itemEntities = new ArrayList<>();
        double computedTotal = 0;
        if (request.getItems() != null) {
            for (QuotationItemRequest itemRequest : request.getItems()) {
                QuotationItem item = new QuotationItem();
                item.setProductName(normalize(itemRequest.getProductName()));
                item.setGrade(normalize(itemRequest.getGrade()));
                item.setQuantity(safeNonNegative(itemRequest.getQuantity()));
                item.setUnitPrice(safeNonNegative(itemRequest.getUnitPrice()));
                double lineTotal = item.getQuantity() * item.getUnitPrice();
                item.setTotalPrice(lineTotal);
                computedTotal += lineTotal;
                itemEntities.add(item);
            }
        }

        quotation.setItems(itemEntities);
        quotation.setTotalAmount(computedTotal);
    }

    private QuotationResponse toResponse(Quotation quotation) {
        QuotationResponse response = new QuotationResponse();
        response.setId(quotation.getId());
        response.setQuotationNumber(quotation.getQuotationNumber());
        response.setCustomerName(quotation.getCustomerName());
        response.setDate(quotation.getDate());
        response.setTotalAmount(quotation.getTotalAmount());
        response.setAddress(quotation.getAddress());
        response.setContact(quotation.getContact());
        response.setGstNo(quotation.getGstNo());
        response.setSiteName(quotation.getSiteName());
        response.setContactPerson(quotation.getContactPerson());

        List<QuotationItemResponse> items = new ArrayList<>();
        for (QuotationItem item : quotation.getItems()) {
            QuotationItemResponse itemResponse = new QuotationItemResponse();
            itemResponse.setId(item.getId());
            itemResponse.setProductName(item.getProductName());
            itemResponse.setGrade(item.getGrade());
            itemResponse.setQuantity(item.getQuantity());
            itemResponse.setUnitPrice(item.getUnitPrice());
            itemResponse.setTotalPrice(item.getTotalPrice());
            items.add(itemResponse);
        }

        response.setItems(items);
        return response;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private double safeNonNegative(double value) {
        if (!Double.isFinite(value) || value < 0) {
            return 0;
        }
        return value;
    }
}
