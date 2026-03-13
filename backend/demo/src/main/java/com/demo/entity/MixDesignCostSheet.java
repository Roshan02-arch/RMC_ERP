package com.demo.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "mix_design_cost_sheets")
public class MixDesignCostSheet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String gradeCode;

    @Column(nullable = false)
    private String gradeLabel;

    private double totalDensity;
    private double totalCostPerM3;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "sheet", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("displayOrder ASC, id ASC")
    private List<MixDesignCostLine> lines = new ArrayList<>();

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void addLine(MixDesignCostLine line) {
        line.setSheet(this);
        this.lines.add(line);
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getGradeCode() {
        return gradeCode;
    }

    public void setGradeCode(String gradeCode) {
        this.gradeCode = gradeCode;
    }

    public String getGradeLabel() {
        return gradeLabel;
    }

    public void setGradeLabel(String gradeLabel) {
        this.gradeLabel = gradeLabel;
    }

    public double getTotalDensity() {
        return totalDensity;
    }

    public void setTotalDensity(double totalDensity) {
        this.totalDensity = totalDensity;
    }

    public double getTotalCostPerM3() {
        return totalCostPerM3;
    }

    public void setTotalCostPerM3(double totalCostPerM3) {
        this.totalCostPerM3 = totalCostPerM3;
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

    public List<MixDesignCostLine> getLines() {
        return lines;
    }

    public void setLines(List<MixDesignCostLine> lines) {
        this.lines = lines;
    }
}
