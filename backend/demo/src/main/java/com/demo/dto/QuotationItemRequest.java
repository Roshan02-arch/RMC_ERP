package com.demo.dto;

public class QuotationItemRequest {
    private Long id;
    private String productName;
    private String grade;
    private double quantity;
    private double unitPrice;
    private String requirementNote;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public String getGrade() {
        return grade;
    }

    public void setGrade(String grade) {
        this.grade = grade;
    }

    public double getQuantity() {
        return quantity;
    }

    public void setQuantity(double quantity) {
        this.quantity = quantity;
    }

    public double getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(double unitPrice) {
        this.unitPrice = unitPrice;
    }

    public String getRequirementNote() {
        return requirementNote;
    }

    public void setRequirementNote(String requirementNote) {
        this.requirementNote = requirementNote;
    }
}
