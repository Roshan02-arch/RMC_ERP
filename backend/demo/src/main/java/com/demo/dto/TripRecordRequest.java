package com.demo.dto;

import java.time.LocalDateTime;

public class TripRecordRequest {

    private Integer tripNumber;
    private String status;
    private LocalDateTime scheduledDispatchTime;
    private LocalDateTime actualDispatchTime;
    private LocalDateTime deliveredTime;
    private Double fuelUsedLiters;
    private String remarks;
    private String transitMixerNumber;
    private String driverName;

    public Integer getTripNumber() {
        return tripNumber;
    }

    public void setTripNumber(Integer tripNumber) {
        this.tripNumber = tripNumber;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getScheduledDispatchTime() {
        return scheduledDispatchTime;
    }

    public void setScheduledDispatchTime(LocalDateTime scheduledDispatchTime) {
        this.scheduledDispatchTime = scheduledDispatchTime;
    }

    public LocalDateTime getActualDispatchTime() {
        return actualDispatchTime;
    }

    public void setActualDispatchTime(LocalDateTime actualDispatchTime) {
        this.actualDispatchTime = actualDispatchTime;
    }

    public LocalDateTime getDeliveredTime() {
        return deliveredTime;
    }

    public void setDeliveredTime(LocalDateTime deliveredTime) {
        this.deliveredTime = deliveredTime;
    }

    public Double getFuelUsedLiters() {
        return fuelUsedLiters;
    }

    public void setFuelUsedLiters(Double fuelUsedLiters) {
        this.fuelUsedLiters = fuelUsedLiters;
    }

    public String getRemarks() {
        return remarks;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
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
}
