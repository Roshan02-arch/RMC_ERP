package com.demo.dto;

import java.time.LocalDateTime;

public class DispatchScheduleRequest {

    private LocalDateTime dispatchDateTime;
    private String tripPlanning;
    private String deliverySequence;
    private LocalDateTime expectedArrivalTime;

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
}
