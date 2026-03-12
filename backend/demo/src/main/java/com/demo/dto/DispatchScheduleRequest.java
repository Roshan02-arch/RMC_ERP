package com.demo.dto;

import java.time.LocalDateTime;

public class DispatchScheduleRequest {

    private LocalDateTime dispatchDateTime;
    private String tripPlanning;
    private Integer plannedTrips;
    private String deliverySequence;
    private LocalDateTime expectedArrivalTime;
    private Double truckCapacityM3;
    private Integer estimatedTravelMinutes;
    private Integer dispatchIntervalMinutes;

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

    public Integer getPlannedTrips() {
        return plannedTrips;
    }

    public void setPlannedTrips(Integer plannedTrips) {
        this.plannedTrips = plannedTrips;
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

    public Double getTruckCapacityM3() {
        return truckCapacityM3;
    }

    public void setTruckCapacityM3(Double truckCapacityM3) {
        this.truckCapacityM3 = truckCapacityM3;
    }

    public Integer getEstimatedTravelMinutes() {
        return estimatedTravelMinutes;
    }

    public void setEstimatedTravelMinutes(Integer estimatedTravelMinutes) {
        this.estimatedTravelMinutes = estimatedTravelMinutes;
    }

    public Integer getDispatchIntervalMinutes() {
        return dispatchIntervalMinutes;
    }

    public void setDispatchIntervalMinutes(Integer dispatchIntervalMinutes) {
        this.dispatchIntervalMinutes = dispatchIntervalMinutes;
    }
}
