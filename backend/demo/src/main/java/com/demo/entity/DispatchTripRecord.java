package com.demo.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "dispatch_trip_records")
public class DispatchTripRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Integer tripNumber;

    @Enumerated(EnumType.STRING)
    private DispatchTripStatus status;

    private LocalDateTime scheduledDispatchTime;
    private LocalDateTime actualDispatchTime;
    private LocalDateTime estimatedDeliveryTime;
    private LocalDateTime deliveredTime;

    private Double tripQuantityM3;
    private String shift;
    private Double fuelUsedLiters;
    private String remarks;
    private String returnReason;
    private Double returnedQuantity;

    private String transitMixerNumber;
    private String driverName;

    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "order_id")
    private Order order;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Integer getTripNumber() {
        return tripNumber;
    }

    public void setTripNumber(Integer tripNumber) {
        this.tripNumber = tripNumber;
    }

    public DispatchTripStatus getStatus() {
        return status;
    }

    public void setStatus(DispatchTripStatus status) {
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

    public LocalDateTime getEstimatedDeliveryTime() {
        return estimatedDeliveryTime;
    }

    public void setEstimatedDeliveryTime(LocalDateTime estimatedDeliveryTime) {
        this.estimatedDeliveryTime = estimatedDeliveryTime;
    }

    public Double getTripQuantityM3() {
        return tripQuantityM3;
    }

    public void setTripQuantityM3(Double tripQuantityM3) {
        this.tripQuantityM3 = tripQuantityM3;
    }

    public String getShift() {
        return shift;
    }

    public void setShift(String shift) {
        this.shift = shift;
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

    public Order getOrder() {
        return order;
    }

    public void setOrder(Order order) {
        this.order = order;
    }
}
