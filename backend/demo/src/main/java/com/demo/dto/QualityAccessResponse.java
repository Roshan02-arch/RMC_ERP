package com.demo.dto;

import java.time.LocalDateTime;

public class QualityAccessResponse {

    private String orderId;
    private String grade;
    private String status;
    private String approvedMixDesignDetails;
    private String materialProportions;
    private double slumpTestResultMm;
    private String slumpRequiredRangeMm;
    private boolean slumpWithinStandard;
    private double cubeStrength7DayMpa;
    private double cubeStrength28DayMpa;
    private double requiredStrengthMpa;
    private boolean cube7DayWithinStandard;
    private boolean cube28DayWithinStandard;
    private boolean qualityCertificateGenerated;
    private String qualityCertificateNumber;
    private LocalDateTime qualityCertificateGeneratedAt;
    private String qualityRemarks;

    public String getOrderId() {
        return orderId;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
    }

    public String getGrade() {
        return grade;
    }

    public void setGrade(String grade) {
        this.grade = grade;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getApprovedMixDesignDetails() {
        return approvedMixDesignDetails;
    }

    public void setApprovedMixDesignDetails(String approvedMixDesignDetails) {
        this.approvedMixDesignDetails = approvedMixDesignDetails;
    }

    public String getMaterialProportions() {
        return materialProportions;
    }

    public void setMaterialProportions(String materialProportions) {
        this.materialProportions = materialProportions;
    }

    public double getSlumpTestResultMm() {
        return slumpTestResultMm;
    }

    public void setSlumpTestResultMm(double slumpTestResultMm) {
        this.slumpTestResultMm = slumpTestResultMm;
    }

    public String getSlumpRequiredRangeMm() {
        return slumpRequiredRangeMm;
    }

    public void setSlumpRequiredRangeMm(String slumpRequiredRangeMm) {
        this.slumpRequiredRangeMm = slumpRequiredRangeMm;
    }

    public boolean isSlumpWithinStandard() {
        return slumpWithinStandard;
    }

    public void setSlumpWithinStandard(boolean slumpWithinStandard) {
        this.slumpWithinStandard = slumpWithinStandard;
    }

    public double getCubeStrength7DayMpa() {
        return cubeStrength7DayMpa;
    }

    public void setCubeStrength7DayMpa(double cubeStrength7DayMpa) {
        this.cubeStrength7DayMpa = cubeStrength7DayMpa;
    }

    public double getCubeStrength28DayMpa() {
        return cubeStrength28DayMpa;
    }

    public void setCubeStrength28DayMpa(double cubeStrength28DayMpa) {
        this.cubeStrength28DayMpa = cubeStrength28DayMpa;
    }

    public double getRequiredStrengthMpa() {
        return requiredStrengthMpa;
    }

    public void setRequiredStrengthMpa(double requiredStrengthMpa) {
        this.requiredStrengthMpa = requiredStrengthMpa;
    }

    public boolean isCube7DayWithinStandard() {
        return cube7DayWithinStandard;
    }

    public void setCube7DayWithinStandard(boolean cube7DayWithinStandard) {
        this.cube7DayWithinStandard = cube7DayWithinStandard;
    }

    public boolean isCube28DayWithinStandard() {
        return cube28DayWithinStandard;
    }

    public void setCube28DayWithinStandard(boolean cube28DayWithinStandard) {
        this.cube28DayWithinStandard = cube28DayWithinStandard;
    }

    public boolean isQualityCertificateGenerated() {
        return qualityCertificateGenerated;
    }

    public void setQualityCertificateGenerated(boolean qualityCertificateGenerated) {
        this.qualityCertificateGenerated = qualityCertificateGenerated;
    }

    public String getQualityCertificateNumber() {
        return qualityCertificateNumber;
    }

    public void setQualityCertificateNumber(String qualityCertificateNumber) {
        this.qualityCertificateNumber = qualityCertificateNumber;
    }

    public LocalDateTime getQualityCertificateGeneratedAt() {
        return qualityCertificateGeneratedAt;
    }

    public void setQualityCertificateGeneratedAt(LocalDateTime qualityCertificateGeneratedAt) {
        this.qualityCertificateGeneratedAt = qualityCertificateGeneratedAt;
    }

    public String getQualityRemarks() {
        return qualityRemarks;
    }

    public void setQualityRemarks(String qualityRemarks) {
        this.qualityRemarks = qualityRemarks;
    }
}
