package com.demo.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "mix_design_cost_lines")
public class MixDesignCostLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private int displayOrder;
    private String ingredientName;
    private String unit;
    private double rate;
    private double quantityPerM3;
    private double costPerM3;

    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "sheet_id")
    private MixDesignCostSheet sheet;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public int getDisplayOrder() {
        return displayOrder;
    }

    public void setDisplayOrder(int displayOrder) {
        this.displayOrder = displayOrder;
    }

    public String getIngredientName() {
        return ingredientName;
    }

    public void setIngredientName(String ingredientName) {
        this.ingredientName = ingredientName;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public double getRate() {
        return rate;
    }

    public void setRate(double rate) {
        this.rate = rate;
    }

    public double getQuantityPerM3() {
        return quantityPerM3;
    }

    public void setQuantityPerM3(double quantityPerM3) {
        this.quantityPerM3 = quantityPerM3;
    }

    public double getCostPerM3() {
        return costPerM3;
    }

    public void setCostPerM3(double costPerM3) {
        this.costPerM3 = costPerM3;
    }

    public MixDesignCostSheet getSheet() {
        return sheet;
    }

    public void setSheet(MixDesignCostSheet sheet) {
        this.sheet = sheet;
    }
}
