package com.demo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "mix_designs")
public class MixDesign {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String mixDesignId;

    @Column(nullable = false)
    private String grade;

    private double cement;
    private double sand;
    private double aggregate;
    private double water;
    private double admixtures;

    private double requiredStrengthMpa;
    private double slumpMinMm;
    private double slumpMaxMm;

    private boolean approved;
    private String approvalRemarks;
    private LocalDateTime approvedAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (mixDesignId == null || mixDesignId.isBlank()) {
            mixDesignId = "MD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
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

    public String getMixDesignId() {
        return mixDesignId;
    }

    public void setMixDesignId(String mixDesignId) {
        this.mixDesignId = mixDesignId;
    }

    public String getGrade() {
        return grade;
    }

    public void setGrade(String grade) {
        this.grade = grade;
    }

    public double getCement() {
        return cement;
    }

    public void setCement(double cement) {
        this.cement = cement;
    }

    public double getSand() {
        return sand;
    }

    public void setSand(double sand) {
        this.sand = sand;
    }

    public double getAggregate() {
        return aggregate;
    }

    public void setAggregate(double aggregate) {
        this.aggregate = aggregate;
    }

    public double getWater() {
        return water;
    }

    public void setWater(double water) {
        this.water = water;
    }

    public double getAdmixtures() {
        return admixtures;
    }

    public void setAdmixtures(double admixtures) {
        this.admixtures = admixtures;
    }

    public double getRequiredStrengthMpa() {
        return requiredStrengthMpa;
    }

    public void setRequiredStrengthMpa(double requiredStrengthMpa) {
        this.requiredStrengthMpa = requiredStrengthMpa;
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

    public boolean isApproved() {
        return approved;
    }

    public void setApproved(boolean approved) {
        this.approved = approved;
    }

    public String getApprovalRemarks() {
        return approvalRemarks;
    }

    public void setApprovalRemarks(String approvalRemarks) {
        this.approvalRemarks = approvalRemarks;
    }

    public LocalDateTime getApprovedAt() {
        return approvedAt;
    }

    public void setApprovedAt(LocalDateTime approvedAt) {
        this.approvedAt = approvedAt;
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
