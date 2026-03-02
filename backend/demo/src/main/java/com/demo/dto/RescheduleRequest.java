package com.demo.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class RescheduleRequest {

    private LocalDate productionDate;
    private LocalDateTime productionSlotStart;
    private LocalDateTime productionSlotEnd;
    private String plantAllocation;
    private String priorityLevel;
    private LocalDateTime dispatchDateTime;
    private String tripPlanning;
    private String deliverySequence;
    private LocalDateTime expectedArrivalTime;
    private String transitMixerNumber;
    private String driverName;
    private String driverShift;
    private String backupTransitMixerNumber;
    private String backupDriverName;
    private String rescheduleReason;

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

    public LocalDateTime getDispatchDateTime() {
        return dispatchDateTime;
    }

    public void setDispatchDateTime(LocalDateTime dispatchDateTime) {
        this.dispatchDateTime = dispatchDateTime;
    }

    public String getTripPlanning() {
        return tripPlanning;
    }

    public void setTripPlanning(String tripPlanning) {
        this.tripPlanning = tripPlanning;
    }

    public String getDeliverySequence() {
        return deliverySequence;
    }

    public void setDeliverySequence(String deliverySequence) {
        this.deliverySequence = deliverySequence;
    }

    public LocalDateTime getExpectedArrivalTime() {
        return expectedArrivalTime;
    }

    public void setExpectedArrivalTime(LocalDateTime expectedArrivalTime) {
        this.expectedArrivalTime = expectedArrivalTime;
    }

    public String getTransitMixerNumber() {
        return transitMixerNumber;
    }

    public void setTransitMixerNumber(String transitMixerNumber) {
        this.transitMixerNumber = transitMixerNumber;
    }

    public String getDriverName() {
        return driverName;
    }

    public void setDriverName(String driverName) {
        this.driverName = driverName;
    }

    public String getDriverShift() {
        return driverShift;
    }

    public void setDriverShift(String driverShift) {
        this.driverShift = driverShift;
    }

    public String getBackupTransitMixerNumber() {
        return backupTransitMixerNumber;
    }

    public void setBackupTransitMixerNumber(String backupTransitMixerNumber) {
        this.backupTransitMixerNumber = backupTransitMixerNumber;
    }

    public String getBackupDriverName() {
        return backupDriverName;
    }

    public void setBackupDriverName(String backupDriverName) {
        this.backupDriverName = backupDriverName;
    }

    public String getRescheduleReason() {
        return rescheduleReason;
    }

    public void setRescheduleReason(String rescheduleReason) {
        this.rescheduleReason = rescheduleReason;
    }
}
