package com.demo.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class ProductionScheduleRequest {

    private LocalDate productionDate;
    private LocalDateTime productionSlotStart;
    private LocalDateTime productionSlotEnd;
    private String plantAllocation;
    private String priorityLevel;

    public LocalDate getProductionDate() {
        return productionDate;
    }

    public void setProductionDate(LocalDate productionDate) {
        this.productionDate = productionDate;
    }

    public LocalDateTime getProductionSlotStart() {
        return productionSlotStart;
    }

    public void setProductionSlotStart(LocalDateTime productionSlotStart) {
        this.productionSlotStart = productionSlotStart;
    }

    public LocalDateTime getProductionSlotEnd() {
        return productionSlotEnd;
    }

    public void setProductionSlotEnd(LocalDateTime productionSlotEnd) {
        this.productionSlotEnd = productionSlotEnd;
    }

    public String getPlantAllocation() {
        return plantAllocation;
    }

    public void setPlantAllocation(String plantAllocation) {
        this.plantAllocation = plantAllocation;
    }

    public String getPriorityLevel() {
        return priorityLevel;
    }

    public void setPriorityLevel(String priorityLevel) {
        this.priorityLevel = priorityLevel;
    }
}
