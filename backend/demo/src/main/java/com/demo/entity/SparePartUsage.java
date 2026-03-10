package com.demo.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "spare_part_usages")
public class SparePartUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private double quantityUsed;
    private double totalCost;
    private String note;
    private LocalDateTime usedAt;

    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "spare_part_id")
    private SparePart sparePart;

    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "breakdown_id")
    private EquipmentBreakdown breakdown;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public double getQuantityUsed() {
        return quantityUsed;
    }

    public void setQuantityUsed(double quantityUsed) {
        this.quantityUsed = quantityUsed;
    }

    public double getTotalCost() {
        return totalCost;
    }

    public void setTotalCost(double totalCost) {
        this.totalCost = totalCost;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public LocalDateTime getUsedAt() {
        return usedAt;
    }

    public void setUsedAt(LocalDateTime usedAt) {
        this.usedAt = usedAt;
    }

    public SparePart getSparePart() {
        return sparePart;
    }

    public void setSparePart(SparePart sparePart) {
        this.sparePart = sparePart;
    }

    public EquipmentBreakdown getBreakdown() {
        return breakdown;
    }

    public void setBreakdown(EquipmentBreakdown breakdown) {
        this.breakdown = breakdown;
    }
}
