package com.demo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "quality_inspections")
public class QualityInspection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String inspectionNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mix_design_id")
    private MixDesign mixDesign;

    private String batchCode;

    private double slumpTestResultMm;
    private double slumpMinMm;
    private double slumpMaxMm;
    private boolean slumpWithinStandard;

    private double requiredStrengthMpa;
    private double cubeStrength7DayMpa;
    private double cubeStrength14DayMpa;
    private double cubeStrength28DayMpa;
    private boolean cube7DayWithinStandard;
    private boolean cube14DayWithinStandard;
    private boolean cube28DayWithinStandard;

    private boolean qualityCertificateGenerated;
    private String qualityCertificateNumber;
    private LocalDateTime qualityCertificateGeneratedAt;

    private String qualityRemarks;
    private boolean compliancePassed;

    private Long recordedByAdminId;
    private LocalDateTime recordedAt;
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        recordedAt = now;
        updatedAt = now;
        if (inspectionNumber == null || inspectionNumber.isBlank()) {
            inspectionNumber = "QIN-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase();
        }
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getInspectionNumber() {
        return inspectionNumber;
    }

    public void setInspectionNumber(String inspectionNumber) {
        this.inspectionNumber = inspectionNumber;
    }

    public Order getOrder() {
        return order;
    }

    public void setOrder(Order order) {
        this.order = order;
    }

    public MixDesign getMixDesign() {
        return mixDesign;
    }

    public void setMixDesign(MixDesign mixDesign) {
        this.mixDesign = mixDesign;
    }

    public String getBatchCode() {
        return batchCode;
    }

    public void setBatchCode(String batchCode) {
        this.batchCode = batchCode;
    }

    public double getSlumpTestResultMm() {
        return slumpTestResultMm;
    }

    public void setSlumpTestResultMm(double slumpTestResultMm) {
        this.slumpTestResultMm = slumpTestResultMm;
    }

    public double getSlumpMinMm() {
        return slumpMinMm;
    }

    public void setSlumpMinMm(double slumpMinMm) {
        this.slumpMinMm = slumpMinMm;
    }

    public double getSlumpMaxMm() {
        return slumpMaxMm;
    }

    public void setSlumpMaxMm(double slumpMaxMm) {
        this.slumpMaxMm = slumpMaxMm;
    }

    public boolean isSlumpWithinStandard() {
        return slumpWithinStandard;
    }

    public void setSlumpWithinStandard(boolean slumpWithinStandard) {
        this.slumpWithinStandard = slumpWithinStandard;
    }

    public double getRequiredStrengthMpa() {
        return requiredStrengthMpa;
    }

    public void setRequiredStrengthMpa(double requiredStrengthMpa) {
        this.requiredStrengthMpa = requiredStrengthMpa;
    }

    public double getCubeStrength7DayMpa() {
        return cubeStrength7DayMpa;
    }

    public void setCubeStrength7DayMpa(double cubeStrength7DayMpa) {
        this.cubeStrength7DayMpa = cubeStrength7DayMpa;
    }

    public double getCubeStrength14DayMpa() {
        return cubeStrength14DayMpa;
    }

    public void setCubeStrength14DayMpa(double cubeStrength14DayMpa) {
        this.cubeStrength14DayMpa = cubeStrength14DayMpa;
    }

    public double getCubeStrength28DayMpa() {
        return cubeStrength28DayMpa;
    }

    public void setCubeStrength28DayMpa(double cubeStrength28DayMpa) {
        this.cubeStrength28DayMpa = cubeStrength28DayMpa;
    }

    public boolean isCube7DayWithinStandard() {
        return cube7DayWithinStandard;
    }

    public void setCube7DayWithinStandard(boolean cube7DayWithinStandard) {
        this.cube7DayWithinStandard = cube7DayWithinStandard;
    }

    public boolean isCube14DayWithinStandard() {
        return cube14DayWithinStandard;
    }

    public void setCube14DayWithinStandard(boolean cube14DayWithinStandard) {
        this.cube14DayWithinStandard = cube14DayWithinStandard;
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

    public boolean isCompliancePassed() {
        return compliancePassed;
    }

    public void setCompliancePassed(boolean compliancePassed) {
        this.compliancePassed = compliancePassed;
    }

    public Long getRecordedByAdminId() {
        return recordedByAdminId;
    }

    public void setRecordedByAdminId(Long recordedByAdminId) {
        this.recordedByAdminId = recordedByAdminId;
    }

    public LocalDateTime getRecordedAt() {
        return recordedAt;
    }

    public void setRecordedAt(LocalDateTime recordedAt) {
        this.recordedAt = recordedAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
