package com.demo.service;

import com.demo.dto.QuotationItemRequest;
import com.demo.dto.QuotationItemResponse;
import com.demo.dto.QuotationRequest;
import com.demo.dto.QuotationResponse;
import com.demo.entity.NotificationType;
import com.demo.entity.Quotation;
import com.demo.entity.QuotationItem;
import com.demo.entity.User;
import com.demo.repository.QuotationRepository;
import com.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class QuotationServiceImpl implements QuotationService {

    private static final Set<String> OPEN_STATUSES = Set.of("PENDING", "APPROVED", "DRAFT", "QUOTATION_SENT", "CUSTOMER_REVIEWED");

    @Autowired
    private QuotationRepository quotationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OrderNotificationService orderNotificationService;

    @Override
    @Transactional
    public QuotationResponse create(QuotationRequest request) {
        String quotationNumber = normalize(request.getQuotationNumber());
        if (quotationNumber.isEmpty()) {
            quotationNumber = generateQuotationNumber();
        }
        if (quotationRepository.findByQuotationNumber(quotationNumber).isPresent()) {
            throw new RuntimeException("Quotation number already exists");
        }

        Quotation quotation = new Quotation();
        quotation.setQuotationNumber(quotationNumber);
        if (normalize(request.getRequestId()).isEmpty()) {
            quotation.setRequestId(generateRequestId());
        } else {
            quotation.setRequestId(normalize(request.getRequestId()));
        }
        quotation.setStatus(normalizeStatus(request.getStatus()).isEmpty() ? "DRAFT" : normalizeStatus(request.getStatus()));
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
    public List<QuotationResponse> listRequestsForAdmin() {
        List<QuotationResponse> response = new ArrayList<>();
        List<Quotation> rows = quotationRepository.findByStatusInOrderByCreatedAtDesc(List.of(
                "PENDING",
                "APPROVED",
                "DRAFT",
                "QUOTATION_SENT",
            "CUSTOMER_REVIEWED",
                "ACCEPTED",
                "REJECTED"
        ));
        for (Quotation quotation : rows) {
            response.add(toResponse(quotation));
        }
        return response;
    }

    @Override
    public List<QuotationResponse> listByCustomer(Long userId) {
        if (userId == null || userId <= 0) {
            throw new RuntimeException("Invalid userId");
        }
        List<QuotationResponse> response = new ArrayList<>();
        for (Quotation quotation : quotationRepository.findByCustomerUserIdOrderByCreatedAtDesc(userId)) {
            QuotationResponse item = toResponse(quotation);
            if ("DRAFT".equals(normalizeStatus(item.getStatus()))) {
                item.setStatus("APPROVED");
            }
            response.add(item);
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
        if (normalizeStatus(quotation.getStatus()).equals("APPROVED")) {
            quotation.setStatus("DRAFT");
        }
        applyRequest(quotation, request, false);
        Quotation saved = quotationRepository.save(quotation);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public QuotationResponse createCustomerRequest(Long userId, QuotationRequest request) {
        if (userId == null || userId <= 0) {
            throw new RuntimeException("Invalid userId");
        }

        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        List<QuotationItemRequest> requestedItems = request.getItems() == null ? List.of() : request.getItems();
        if (requestedItems.isEmpty()) {
            throw new RuntimeException("At least one product is required");
        }

        for (QuotationItemRequest item : requestedItems) {
            String product = normalize(item.getProductName());
            double quantity = safeNonNegative(item.getQuantity());
            if (product.isEmpty() || quantity <= 0) {
                throw new RuntimeException("Each product requires valid name and quantity");
            }
        }

        Quotation quotation = new Quotation();
        quotation.setRequestId(generateRequestId());
        quotation.setQuotationNumber(quotation.getRequestId());
        quotation.setCustomerUserId(userId);
        quotation.setStatus("PENDING");
        quotation.setCustomerName(normalize(request.getCustomerName()).isEmpty() ? normalize(user.getName()) : normalize(request.getCustomerName()));
        quotation.setDate(request.getDate() == null ? LocalDate.now() : request.getDate());
        quotation.setAddress(normalize(request.getAddress()).isEmpty() ? normalize(user.getAddress()) : normalize(request.getAddress()));
        quotation.setContact(normalize(request.getContact()).isEmpty() ? normalize(user.getNumber()) : normalize(request.getContact()));
        quotation.setGstNo(normalize(request.getGstNo()));
        quotation.setSiteName(normalize(request.getSiteName()));
        quotation.setContactPerson(normalize(request.getContactPerson()).isEmpty() ? quotation.getCustomerName() : normalize(request.getContactPerson()));
        quotation.setRequestNotes(normalize(request.getRequestNotes()));
        quotation.setTermsAndConditions(normalize(request.getTermsAndConditions()));
        quotation.setSubTotalAmount(0);
        quotation.setTaxAmount(0);
        quotation.setDiscountAmount(0);
        quotation.setTotalAmount(0);

        List<QuotationItem> entities = new ArrayList<>();
        for (QuotationItemRequest itemRequest : requestedItems) {
            QuotationItem item = new QuotationItem();
            String productName = normalize(itemRequest.getProductName());
            item.setProductName(productName);
            item.setGrade(normalize(itemRequest.getGrade()).isEmpty() ? productName : normalize(itemRequest.getGrade()));
            double quantity = safeNonNegative(itemRequest.getQuantity());
            double unitPrice = safeNonNegative(itemRequest.getUnitPrice());
            item.setQuantity(quantity);
            item.setUnitPrice(unitPrice);
            item.setTotalPrice(quantity * unitPrice);
            item.setRequirementNote(normalize(itemRequest.getRequirementNote()));
            entities.add(item);
        }
        quotation.setItems(entities);

        double subTotal = entities.stream().mapToDouble(QuotationItem::getTotalPrice).sum();
        double gstAmount = (subTotal * 18) / 100;
        quotation.setSubTotalAmount(subTotal);
        quotation.setTaxAmount(gstAmount);
        quotation.setDiscountAmount(0);
        quotation.setTotalAmount(subTotal + gstAmount);

        Quotation saved = quotationRepository.save(quotation);
        notifyCustomer(saved, NotificationType.QUOTATION_REQUEST_SENT, "Quotation request sent successfully.");
        notifyAdmins(saved, NotificationType.NEW_QUOTATION_REQUEST, "New quotation request received: " + saved.getRequestId());
        return toResponse(saved);
    }

    @Override
    @Transactional
    public QuotationResponse updateCustomerRequest(Long id, Long userId, QuotationRequest request) {
        Quotation quotation = quotationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Quotation request not found"));

        if (quotation.getCustomerUserId() == null || !quotation.getCustomerUserId().equals(userId)) {
            throw new RuntimeException("You are not allowed to edit this request");
        }
        if (!"PENDING".equals(normalizeStatus(quotation.getStatus()))) {
            throw new RuntimeException("Only pending requests can be edited");
        }

        List<QuotationItemRequest> requestedItems = request.getItems() == null ? List.of() : request.getItems();
        if (requestedItems.isEmpty()) {
            throw new RuntimeException("At least one product is required");
        }

        quotation.setRequestNotes(normalize(request.getRequestNotes()));
        quotation.setAddress(normalize(request.getAddress()).isEmpty() ? quotation.getAddress() : normalize(request.getAddress()));
        quotation.setContact(normalize(request.getContact()).isEmpty() ? quotation.getContact() : normalize(request.getContact()));

        List<QuotationItem> entities = new ArrayList<>();
        for (QuotationItemRequest itemRequest : requestedItems) {
            String productName = normalize(itemRequest.getProductName());
            if (productName.isEmpty() || safeNonNegative(itemRequest.getQuantity()) <= 0) {
                continue;
            }
            QuotationItem item = new QuotationItem();
            item.setProductName(productName);
            item.setGrade(normalize(itemRequest.getGrade()).isEmpty() ? productName : normalize(itemRequest.getGrade()));
            double quantity = safeNonNegative(itemRequest.getQuantity());
            double unitPrice = safeNonNegative(itemRequest.getUnitPrice());
            item.setQuantity(quantity);
            item.setUnitPrice(unitPrice);
            item.setTotalPrice(quantity * unitPrice);
            item.setRequirementNote(normalize(itemRequest.getRequirementNote()));
            entities.add(item);
        }

        if (entities.isEmpty()) {
            throw new RuntimeException("At least one valid product is required");
        }

        quotation.setItems(entities);
        double subTotal = entities.stream().mapToDouble(QuotationItem::getTotalPrice).sum();
        double gstAmount = (subTotal * 18) / 100;
        quotation.setSubTotalAmount(subTotal);
        quotation.setTaxAmount(gstAmount);
        quotation.setDiscountAmount(0);
        quotation.setTotalAmount(subTotal + gstAmount);
        Quotation saved = quotationRepository.save(quotation);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public QuotationResponse approveRequest(Long id, Long adminUserId) {
        validateAdmin(adminUserId);

        Quotation quotation = quotationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Quotation request not found"));

        String status = normalizeStatus(quotation.getStatus());
        if (!"PENDING".equals(status)) {
            throw new RuntimeException("Only pending requests can be approved");
        }

        quotation.setStatus("APPROVED");
        quotation.setApprovedAt(LocalDateTime.now());
        Quotation saved = quotationRepository.save(quotation);
        notifyCustomer(saved, NotificationType.QUOTATION_REQUEST_APPROVED, "Your quotation request has been approved. Admin is preparing quotation.");
        return toResponse(saved);
    }

    @Override
    @Transactional
    public QuotationResponse rejectRequest(Long id, Long adminUserId, String reason) {
        validateAdmin(adminUserId);

        Quotation quotation = quotationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Quotation request not found"));

        String status = normalizeStatus(quotation.getStatus());
        if (!"PENDING".equals(status) && !"APPROVED".equals(status)) {
            throw new RuntimeException("Only pending or approved requests can be rejected");
        }

        quotation.setStatus("REJECTED");
        quotation.setRespondedAt(LocalDateTime.now());
        String cleanReason = normalize(reason);
        if (!cleanReason.isEmpty()) {
            quotation.setRequestNotes(cleanReason);
        }
        Quotation saved = quotationRepository.save(quotation);
        notifyCustomer(saved, NotificationType.QUOTATION_RESPONSE_REJECTED, "Your quotation request has been rejected by admin.");
        return toResponse(saved);
    }

    @Override
    @Transactional
    public QuotationResponse sendQuotation(Long id, Long adminUserId, QuotationRequest request) {
        validateAdmin(adminUserId);

        Quotation quotation = quotationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Quotation request not found"));

        String status = normalizeStatus(quotation.getStatus());
        if ("ACCEPTED".equals(status) || "REJECTED".equals(status)) {
            throw new RuntimeException("Cannot send quotation for completed request status");
        }
        if ("PENDING".equals(status) && quotation.getApprovedAt() == null) {
            quotation.setApprovedAt(LocalDateTime.now());
        }

        applyRequest(quotation, request, false);
        quotation.setStatus("QUOTATION_SENT");
        quotation.setSentAt(LocalDateTime.now());

        Quotation saved = quotationRepository.save(quotation);
        notifyCustomer(saved, NotificationType.QUOTATION_SENT, "New quotation received. Please review and accept/reject.");
        return toResponse(saved);
    }

    @Override
    @Transactional
    public QuotationResponse customerDecision(Long id, Long userId, String action) {
        Quotation quotation = quotationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Quotation not found"));

        if (quotation.getCustomerUserId() == null || !quotation.getCustomerUserId().equals(userId)) {
            throw new RuntimeException("You are not allowed to update this quotation");
        }

        String status = normalizeStatus(quotation.getStatus());
        if (!"QUOTATION_SENT".equals(status) && !"CUSTOMER_REVIEWED".equals(status)) {
            throw new RuntimeException("Only sent or reviewed quotations can be accepted or rejected");
        }

        String normalizedAction = normalizeStatus(action);
        if (!"ACCEPT".equals(normalizedAction) && !"REJECT".equals(normalizedAction)) {
            throw new RuntimeException("action must be ACCEPT or REJECT");
        }

        quotation.setStatus("ACCEPT".equals(normalizedAction) ? "ACCEPTED" : "REJECTED");
        quotation.setRespondedAt(LocalDateTime.now());
        Quotation saved = quotationRepository.save(quotation);

        NotificationType type = "ACCEPT".equals(normalizedAction)
                ? NotificationType.QUOTATION_RESPONSE_ACCEPTED
                : NotificationType.QUOTATION_RESPONSE_REJECTED;
        notifyAdmins(saved, type, "Customer " + saved.getCustomerName() + " " + normalizeStatus(saved.getStatus()).toLowerCase(Locale.ROOT) + " quotation " + saved.getQuotationNumber());
        return toResponse(saved);
    }

    @Override
    @Transactional
    public QuotationResponse markCustomerReviewed(Long id, Long userId) {
        Quotation quotation = quotationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Quotation not found"));

        if (quotation.getCustomerUserId() == null || !quotation.getCustomerUserId().equals(userId)) {
            throw new RuntimeException("You are not allowed to review this quotation");
        }

        String status = normalizeStatus(quotation.getStatus());
        if (!"QUOTATION_SENT".equals(status) && !"CUSTOMER_REVIEWED".equals(status)) {
            return toResponse(quotation);
        }

        if (!"CUSTOMER_REVIEWED".equals(status)) {
            quotation.setStatus("CUSTOMER_REVIEWED");
            quotation.setRespondedAt(LocalDateTime.now());
            quotation = quotationRepository.save(quotation);
            notifyAdmins(quotation, NotificationType.DELIVERY_STATUS_UPDATED,
                    "Customer reviewed quotation " + quotation.getQuotationNumber());
        }

        return toResponse(quotation);
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
            quotationNumber = normalize(quotation.getQuotationNumber());
        }
        if (quotationNumber.isEmpty()) {
            quotationNumber = generateQuotationNumber();
        }
        if (customerName.isEmpty()) {
            customerName = normalize(quotation.getCustomerName());
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
        if (normalize(quotation.getRequestId()).isEmpty()) {
            quotation.setRequestId(generateRequestId());
        }
        if (request.getCustomerUserId() != null && request.getCustomerUserId() > 0) {
            quotation.setCustomerUserId(request.getCustomerUserId());
        }
        String requestedStatus = normalizeStatus(request.getStatus());
        if (!requestedStatus.isEmpty()) {
            quotation.setStatus(toPersistedStatus(requestedStatus));
        } else if (normalizeStatus(quotation.getStatus()).isEmpty()) {
            quotation.setStatus("DRAFT");
        }
        quotation.setCustomerName(customerName);
        quotation.setDate(request.getDate() == null ? LocalDate.now() : request.getDate());
        quotation.setAddress(normalize(request.getAddress()));
        quotation.setContact(normalize(request.getContact()));
        quotation.setGstNo(normalize(request.getGstNo()));
        quotation.setSiteName(normalize(request.getSiteName()));
        quotation.setContactPerson(normalize(request.getContactPerson()));
        quotation.setRequestNotes(normalize(request.getRequestNotes()));
        quotation.setTermsAndConditions(normalize(request.getTermsAndConditions()));

        List<QuotationItem> itemEntities = new ArrayList<>();
        double computedSubTotal = 0;
        if (request.getItems() != null) {
            for (QuotationItemRequest itemRequest : request.getItems()) {
                QuotationItem item = new QuotationItem();
                item.setProductName(normalize(itemRequest.getProductName()));
                item.setGrade(normalize(itemRequest.getGrade()));
                item.setQuantity(safeNonNegative(itemRequest.getQuantity()));
                item.setUnitPrice(safeNonNegative(itemRequest.getUnitPrice()));
                item.setRequirementNote(normalize(itemRequest.getRequirementNote()));
                double lineTotal = item.getQuantity() * item.getUnitPrice();
                item.setTotalPrice(lineTotal);
                computedSubTotal += lineTotal;
                itemEntities.add(item);
            }
        }

        quotation.setItems(itemEntities);
        double taxAmount = (computedSubTotal * 18) / 100;
        double discountAmount = safeNonNegative(request.getDiscountAmount());
        quotation.setSubTotalAmount(computedSubTotal);
        quotation.setTaxAmount(taxAmount);
        quotation.setDiscountAmount(discountAmount);
        quotation.setTotalAmount(Math.max(0, computedSubTotal + taxAmount - discountAmount));
    }

    private QuotationResponse toResponse(Quotation quotation) {
        QuotationResponse response = new QuotationResponse();
        response.setId(quotation.getId());
        response.setRequestId(quotation.getRequestId());
        response.setQuotationNumber(quotation.getQuotationNumber());
        response.setCustomerUserId(quotation.getCustomerUserId());
        response.setCustomerName(quotation.getCustomerName());
        response.setStatus(quotation.getStatus());
        response.setDate(quotation.getDate());
        response.setTotalAmount(quotation.getTotalAmount());
        response.setSubTotalAmount(quotation.getSubTotalAmount());
        response.setTaxAmount(quotation.getTaxAmount());
        response.setDiscountAmount(quotation.getDiscountAmount());
        response.setAddress(quotation.getAddress());
        response.setContact(quotation.getContact());
        response.setGstNo(quotation.getGstNo());
        response.setSiteName(quotation.getSiteName());
        response.setContactPerson(quotation.getContactPerson());
        response.setRequestNotes(quotation.getRequestNotes());
        response.setTermsAndConditions(quotation.getTermsAndConditions());
        response.setApprovedAt(quotation.getApprovedAt());
        response.setSentAt(quotation.getSentAt());
        response.setRespondedAt(quotation.getRespondedAt());
        response.setCreatedAt(quotation.getCreatedAt());
        response.setUpdatedAt(quotation.getUpdatedAt());

        List<QuotationItemResponse> items = new ArrayList<>();
        for (QuotationItem item : quotation.getItems()) {
            QuotationItemResponse itemResponse = new QuotationItemResponse();
            itemResponse.setId(item.getId());
            itemResponse.setProductName(item.getProductName());
            itemResponse.setGrade(item.getGrade());
            itemResponse.setQuantity(item.getQuantity());
            itemResponse.setUnitPrice(item.getUnitPrice());
            itemResponse.setTotalPrice(item.getTotalPrice());
            itemResponse.setRequirementNote(item.getRequirementNote());
            items.add(itemResponse);
        }

        response.setItems(items);
        return response;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private String normalizeStatus(String value) {
        return normalize(value).toUpperCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
    }

    private String toPersistedStatus(String value) {
        String normalized = normalizeStatus(value);
        if ("ACCEPT".equals(normalized)) {
            return "ACCEPTED";
        }
        if ("QUOTE_SENT".equals(normalized)) {
            return "QUOTATION_SENT";
        }
        return normalized;
    }

    private String generateRequestId() {
        LocalDateTime now = LocalDateTime.now();
        return String.format(
                "QREQ-%04d%02d%02d-%02d%02d%02d",
                now.getYear(),
                now.getMonthValue(),
                now.getDayOfMonth(),
                now.getHour(),
                now.getMinute(),
                now.getSecond()
        );
    }

    private String generateQuotationNumber() {
        LocalDateTime now = LocalDateTime.now();
        return String.format(
                "QTN-%04d%02d%02d-%02d%02d%02d",
                now.getYear(),
                now.getMonthValue(),
                now.getDayOfMonth(),
                now.getHour(),
                now.getMinute(),
                now.getSecond()
        );
    }

    private void validateAdmin(Long adminUserId) {
        if (adminUserId == null || adminUserId <= 0) {
            throw new RuntimeException("adminUserId is required");
        }
        User admin = userRepository.findById(adminUserId)
                .orElseThrow(() -> new RuntimeException("Admin user not found"));
        if (!"ADMIN".equalsIgnoreCase(normalize(admin.getRole()))) {
            throw new RuntimeException("Only admin can perform this action");
        }
    }

    private String signatureForRequestItems(List<QuotationItemRequest> items) {
        return items.stream()
                .map(item -> (normalize(item.getProductName()) + "|" + safeNonNegative(item.getQuantity())).toLowerCase(Locale.ROOT))
                .sorted()
                .collect(Collectors.joining(","));
    }

    private String signatureForQuotationItems(Quotation quotation) {
        return quotation.getItems().stream()
                .map(item -> (normalize(item.getProductName()) + "|" + safeNonNegative(item.getQuantity())).toLowerCase(Locale.ROOT))
                .sorted()
                .collect(Collectors.joining(","));
    }

    private void notifyCustomer(Quotation quotation, NotificationType type, String message) {
        if (quotation == null || quotation.getCustomerUserId() == null || quotation.getCustomerUserId() <= 0) {
            return;
        }
        orderNotificationService.createNotificationForUser(
                quotation.getCustomerUserId(),
                normalize(quotation.getRequestId()).isEmpty() ? quotation.getQuotationNumber() : quotation.getRequestId(),
                type,
                message
        );
    }

    private void notifyAdmins(Quotation quotation, NotificationType type, String message) {
        if (quotation == null) {
            return;
        }
        List<User> admins = userRepository.findByRole("ADMIN");
        if (admins == null || admins.isEmpty()) {
            return;
        }

        String refId = normalize(quotation.getRequestId()).isEmpty() ? quotation.getQuotationNumber() : quotation.getRequestId();
        for (User admin : admins) {
            if (admin == null || admin.getId() == null) {
                continue;
            }
            orderNotificationService.createNotificationForUser(admin.getId(), refId, type, message);
        }
    }

    private double safeNonNegative(double value) {
        if (!Double.isFinite(value) || value < 0) {
            return 0;
        }
        return value;
    }
}
