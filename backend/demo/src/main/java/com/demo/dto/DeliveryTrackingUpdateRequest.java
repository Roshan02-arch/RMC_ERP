package com.demo.dto;

import java.time.LocalDateTime;

public class DeliveryTrackingUpdateRequest {

    private String deliveryStatus;
    private String transitMixerNumber;
    private String driverName;
    private String driverShift;
    private LocalDateTime dispatchDateTime;
    private LocalDateTime expectedArrivalTime;
    private Double liveLatitude;
    private Double liveLongitude;
    private Integer delayInMinutes;
    private String delayUpdateMessage;
    private String deliveryConfirmationDetails;
    private LocalDateTime deliveredAt;
    private String returnReason;
    private Double returnedQuantity;

    public String getDeliveryStatus() {
        return deliveryStatus;
    }

    public void setDeliveryStatus(String deliveryStatus) {
        this.deliveryStatus = deliveryStatus;
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

    public LocalDateTime getDispatchDateTime() {
        return dispatchDateTime;
    }

    public void setDispatchDateTime(LocalDateTime dispatchDateTime) {
        this.dispatchDateTime = dispatchDateTime;
    }

    public LocalDateTime getExpectedArrivalTime() {
        return expectedArrivalTime;
    }

    public void setExpectedArrivalTime(LocalDateTime expectedArrivalTime) {
        this.expectedArrivalTime = expectedArrivalTime;
    }

    public Double getLiveLatitude() {
        return liveLatitude;
    }

    public void setLiveLatitude(Double liveLatitude) {
        this.liveLatitude = liveLatitude;
    }

    public Double getLiveLongitude() {
        return liveLongitude;
    }

    public void setLiveLongitude(Double liveLongitude) {
        this.liveLongitude = liveLongitude;
    }

    public Integer getDelayInMinutes() {
        return delayInMinutes;
    }

    public void setDelayInMinutes(Integer delayInMinutes) {
        this.delayInMinutes = delayInMinutes;
    }

    public String getDelayUpdateMessage() {
        return delayUpdateMessage;
    }

    public void setDelayUpdateMessage(String delayUpdateMessage) {
        this.delayUpdateMessage = delayUpdateMessage;
    }

    public String getDeliveryConfirmationDetails() {
        return deliveryConfirmationDetails;
    }

    public void setDeliveryConfirmationDetails(String deliveryConfirmationDetails) {
        this.deliveryConfirmationDetails = deliveryConfirmationDetails;
    }

    public LocalDateTime getDeliveredAt() {
        return deliveredAt;
    }

    public void setDeliveredAt(LocalDateTime deliveredAt) {
        this.deliveredAt = deliveredAt;
    }

    public String getReturnReason() {
        return returnReason;
    }

    public void setReturnReason(String returnReason) {
        this.returnReason = returnReason;
    }

    public Double getReturnedQuantity() {
        return returnedQuantity;
    }

    public void setReturnedQuantity(Double returnedQuantity) {
        this.returnedQuantity = returnedQuantity;
    }
}
