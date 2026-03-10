package com.demo.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "equipment_breakdowns")
public class EquipmentBreakdown {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String equipmentType;
    private String machineName;
    private LocalDateTime breakdownTime;
    private String breakdownDetails;
    private String assignedTechnician;
    private String status;
    private LocalDateTime repairCompletedAt;
    private double repairHours;
    private double maintenanceCost;
    private double downtimeHours;
    private String note;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEquipmentType() {
        return equipmentType;
    }

    public void setEquipmentType(String equipmentType) {
        this.equipmentType = equipmentType;
    }

    public String getMachineName() {
        return machineName;
    }

    public void setMachineName(String machineName) {
        this.machineName = machineName;
    }

    public LocalDateTime getBreakdownTime() {
        return breakdownTime;
    }

    public void setBreakdownTime(LocalDateTime breakdownTime) {
        this.breakdownTime = breakdownTime;
    }

    public String getBreakdownDetails() {
        return breakdownDetails;
    }

    public void setBreakdownDetails(String breakdownDetails) {
        this.breakdownDetails = breakdownDetails;
    }

    public String getAssignedTechnician() {
        return assignedTechnician;
    }

    public void setAssignedTechnician(String assignedTechnician) {
        this.assignedTechnician = assignedTechnician;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getRepairCompletedAt() {
        return repairCompletedAt;
    }

    public void setRepairCompletedAt(LocalDateTime repairCompletedAt) {
        this.repairCompletedAt = repairCompletedAt;
    }

    public double getRepairHours() {
        return repairHours;
    }

    public void setRepairHours(double repairHours) {
        this.repairHours = repairHours;
    }

    public double getMaintenanceCost() {
        return maintenanceCost;
    }

    public void setMaintenanceCost(double maintenanceCost) {
        this.maintenanceCost = maintenanceCost;
    }

    public double getDowntimeHours() {
        return downtimeHours;
    }

    public void setDowntimeHours(double downtimeHours) {
        this.downtimeHours = downtimeHours;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
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
