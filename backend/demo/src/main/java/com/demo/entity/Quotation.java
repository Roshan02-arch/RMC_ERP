package com.demo.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "quotation")
public class Quotation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String quotationNumber;

    @Column(unique = true)
    private String requestId;

    private Long customerUserId;

    private String status;

    @Column(nullable = false)
    private String customerName;

    private LocalDate date;

    private double totalAmount;

    private String address;
    private String contact;
    private String gstNo;
    private String siteName;
    private String contactPerson;
    private double distanceKm;
    private String selectedPlant;
    private double transportRatePerKm;
    private double transportCharge;
    private double overheadCharge;
    private double commissionCharge;
    private double gstCharge;
    private double deliveryChargePerCum;

    @Column(length = 2000)
    private String requestNotes;

    @Column(length = 4000)
    private String termsAndConditions;

    private double subTotalAmount;
    private double taxAmount;
    private double discountAmount;

    private LocalDateTime approvedAt;
    private LocalDateTime sentAt;
    private LocalDateTime respondedAt;

    @OneToMany(mappedBy = "quotation", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<QuotationItem> items = new ArrayList<>();

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        if (date == null) {
            date = LocalDate.now();
        }
        if (status == null || status.isBlank()) {
            status = "DRAFT";
        }
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void setItems(List<QuotationItem> items) {
        this.items.clear();
        if (items == null) {
            return;
        }
        for (QuotationItem item : items) {
            item.setQuotation(this);
            this.items.add(item);
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getQuotationNumber() {
        return quotationNumber;
    }

    public void setQuotationNumber(String quotationNumber) {
        this.quotationNumber = quotationNumber;
    }

    public String getRequestId() {
        return requestId;
    }

    public void setRequestId(String requestId) {
        this.requestId = requestId;
    }

    public Long getCustomerUserId() {
        return customerUserId;
    }

    public void setCustomerUserId(Long customerUserId) {
        this.customerUserId = customerUserId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public double getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(double totalAmount) {
        this.totalAmount = totalAmount;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getContact() {
        return contact;
    }

    public void setContact(String contact) {
        this.contact = contact;
    }

    public String getGstNo() {
        return gstNo;
    }

    public void setGstNo(String gstNo) {
        this.gstNo = gstNo;
    }

    public String getSiteName() {
        return siteName;
    }

    public void setSiteName(String siteName) {
        this.siteName = siteName;
    }

    public String getContactPerson() {
        return contactPerson;
    }

    public void setContactPerson(String contactPerson) {
        this.contactPerson = contactPerson;
    }

    public double getDistanceKm() {
        return distanceKm;
    }

    public void setDistanceKm(double distanceKm) {
        this.distanceKm = distanceKm;
    }

    public String getSelectedPlant() {
        return selectedPlant;
    }

    public void setSelectedPlant(String selectedPlant) {
        this.selectedPlant = selectedPlant;
    }

    public double getTransportRatePerKm() {
        return transportRatePerKm;
    }

    public void setTransportRatePerKm(double transportRatePerKm) {
        this.transportRatePerKm = transportRatePerKm;
    }

    public double getTransportCharge() {
        return transportCharge;
    }

    public void setTransportCharge(double transportCharge) {
        this.transportCharge = transportCharge;
    }

    public double getOverheadCharge() {
        return overheadCharge;
    }

    public void setOverheadCharge(double overheadCharge) {
        this.overheadCharge = overheadCharge;
    }

    public double getCommissionCharge() {
        return commissionCharge;
    }

    public void setCommissionCharge(double commissionCharge) {
        this.commissionCharge = commissionCharge;
    }

    public double getGstCharge() {
        return gstCharge;
    }

    public void setGstCharge(double gstCharge) {
        this.gstCharge = gstCharge;
    }

    public double getDeliveryChargePerCum() {
        return deliveryChargePerCum;
    }

    public void setDeliveryChargePerCum(double deliveryChargePerCum) {
        this.deliveryChargePerCum = deliveryChargePerCum;
    }

    public String getRequestNotes() {
        return requestNotes;
    }

    public void setRequestNotes(String requestNotes) {
        this.requestNotes = requestNotes;
    }

    public String getTermsAndConditions() {
        return termsAndConditions;
    }

    public void setTermsAndConditions(String termsAndConditions) {
        this.termsAndConditions = termsAndConditions;
    }

    public double getSubTotalAmount() {
        return subTotalAmount;
    }

    public void setSubTotalAmount(double subTotalAmount) {
        this.subTotalAmount = subTotalAmount;
    }

    public double getTaxAmount() {
        return taxAmount;
    }

    public void setTaxAmount(double taxAmount) {
        this.taxAmount = taxAmount;
    }

    public double getDiscountAmount() {
        return discountAmount;
    }

    public void setDiscountAmount(double discountAmount) {
        this.discountAmount = discountAmount;
    }

    public LocalDateTime getApprovedAt() {
        return approvedAt;
    }

    public void setApprovedAt(LocalDateTime approvedAt) {
        this.approvedAt = approvedAt;
    }

    public LocalDateTime getSentAt() {
        return sentAt;
    }

    public void setSentAt(LocalDateTime sentAt) {
        this.sentAt = sentAt;
    }

    public LocalDateTime getRespondedAt() {
        return respondedAt;
    }

    public void setRespondedAt(LocalDateTime respondedAt) {
        this.respondedAt = respondedAt;
    }

    public List<QuotationItem> getItems() {
        return items;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
