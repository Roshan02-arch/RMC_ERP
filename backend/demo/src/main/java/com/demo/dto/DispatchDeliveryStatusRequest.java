package com.demo.dto;

import java.time.LocalDateTime;

public class DispatchDeliveryStatusRequest {

    private String deliveryStatus;
    private Integer delayInMinutes;
    private String delayUpdateMessage;
    private LocalDateTime deliveredAt;
    private String deliveryConfirmationDetails;

    public String getDeliveryStatus() {
        return deliveryStatus;
    }

    public void setDeliveryStatus(String deliveryStatus) {
        this.deliveryStatus = deliveryStatus;
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

    public LocalDateTime getDeliveredAt() {
        return deliveredAt;
    }

    public void setDeliveredAt(LocalDateTime deliveredAt) {
        this.deliveredAt = deliveredAt;
    }

    public String getDeliveryConfirmationDetails() {
        return deliveryConfirmationDetails;
    }

    public void setDeliveryConfirmationDetails(String deliveryConfirmationDetails) {
        this.deliveryConfirmationDetails = deliveryConfirmationDetails;
    }
}
