package com.demo.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String orderId;
    private String grade;
    private double quantity;
    private double totalPrice;
    private String address;
    private String paymentOption;
    private String paymentType;
    private String creditPeriod;
    private Integer creditDays;
    private String creditStatus;
    private String creditApprovalStatus;
    private LocalDateTime creditRequestedAt;
    private LocalDateTime creditReviewedAt;
    private LocalDateTime creditDueDate;
    private String creditReviewRemark;
    private String orderWorkflowStatus;
    private LocalDateTime createdAt;
    private LocalDateTime paymentReceivedAt;

    private LocalDateTime deliveryDate;
    private LocalDateTime scheduledDate;
    private LocalDateTime approvedAt;
    private LocalDate productionDate;
    private LocalDateTime productionSlotStart;
    private LocalDateTime productionSlotEnd;
    private LocalDateTime dispatchDateTime;
    private LocalDateTime expectedArrivalTime;
    private LocalDateTime lastRescheduledAt;

    private String rescheduleReason;
    private String deliverySequence;
    private String tripPlanning;
    private String latestNotification;
    private Integer delayInMinutes;
    private Double liveLatitude;
    private Double liveLongitude;
    private Integer plannedTrips;
    private Integer completedTrips;
    private Double totalFuelUsedLiters;
    private LocalDateTime deliveredAt;
    private String deliveryConfirmationDetails;
    private String returnReason;
    private Double returnedQuantity;

    @Enumerated(EnumType.STRING)
    private DeliveryTrackingStatus deliveryTrackingStatus;

    @Enumerated(EnumType.STRING)
    private OrderStatus status;

    // Many Orders -> One User
    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    // One Order -> One Assignment
    @JsonIgnore
    @OneToOne(mappedBy = "order", cascade = CascadeType.ALL)
    private OrderAssignment assignment;

    // getters & setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getOrderId() {
        return orderId;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
    }

    public String getGrade() {
        return grade;
    }

    public void setGrade(String grade) {
        this.grade = grade;
    }

    public double getQuantity() {
        return quantity;
    }

    public void setQuantity(double quantity) {
        this.quantity = quantity;
    }

    public double getTotalPrice() {
        return totalPrice;
    }

    public void setTotalPrice(double totalPrice) {
        this.totalPrice = totalPrice;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getPaymentOption() {
        return paymentOption;
    }

    public void setPaymentOption(String paymentOption) {
        this.paymentOption = paymentOption;
    }

    public String getPaymentType() {
        return paymentType;
    }

    public void setPaymentType(String paymentType) {
        this.paymentType = paymentType;
    }

    public String getCreditPeriod() {
        return creditPeriod;
    }

    public void setCreditPeriod(String creditPeriod) {
        this.creditPeriod = creditPeriod;
    }

    public Integer getCreditDays() {
        return creditDays;
    }

    public void setCreditDays(Integer creditDays) {
        this.creditDays = creditDays;
    }

    public String getCreditStatus() {
        return creditStatus;
    }

    public void setCreditStatus(String creditStatus) {
        this.creditStatus = creditStatus;
    }

    public String getCreditApprovalStatus() {
        return creditApprovalStatus;
    }

    public void setCreditApprovalStatus(String creditApprovalStatus) {
        this.creditApprovalStatus = creditApprovalStatus;
    }

    public LocalDateTime getCreditRequestedAt() {
        return creditRequestedAt;
    }

    public void setCreditRequestedAt(LocalDateTime creditRequestedAt) {
        this.creditRequestedAt = creditRequestedAt;
    }

    public LocalDateTime getCreditReviewedAt() {
        return creditReviewedAt;
    }

    public void setCreditReviewedAt(LocalDateTime creditReviewedAt) {
        this.creditReviewedAt = creditReviewedAt;
    }

    public LocalDateTime getCreditDueDate() {
        return creditDueDate;
    }

    public void setCreditDueDate(LocalDateTime creditDueDate) {
        this.creditDueDate = creditDueDate;
    }

    public String getCreditReviewRemark() {
        return creditReviewRemark;
    }

    public void setCreditReviewRemark(String creditReviewRemark) {
        this.creditReviewRemark = creditReviewRemark;
    }

    public String getOrderWorkflowStatus() {
        return orderWorkflowStatus;
    }

    public void setOrderWorkflowStatus(String orderWorkflowStatus) {
        this.orderWorkflowStatus = orderWorkflowStatus;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getPaymentReceivedAt() {
        return paymentReceivedAt;
    }

    public void setPaymentReceivedAt(LocalDateTime paymentReceivedAt) {
        this.paymentReceivedAt = paymentReceivedAt;
    }

    public LocalDateTime getDeliveryDate() {
        return deliveryDate;
    }

    public void setDeliveryDate(LocalDateTime deliveryDate) {
        this.deliveryDate = deliveryDate;
    }

    public LocalDateTime getApprovedAt() {
        return approvedAt;
    }

    public void setApprovedAt(LocalDateTime approvedAt) {
        this.approvedAt = approvedAt;
    }

    public LocalDateTime getScheduledDate() {
        return scheduledDate;
    }

    public void setScheduledDate(LocalDateTime scheduledDate) {
        this.scheduledDate = scheduledDate;
    }

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

    public LocalDateTime getLastRescheduledAt() {
        return lastRescheduledAt;
    }

    public void setLastRescheduledAt(LocalDateTime lastRescheduledAt) {
        this.lastRescheduledAt = lastRescheduledAt;
    }

    public String getRescheduleReason() {
        return rescheduleReason;
    }

    public void setRescheduleReason(String rescheduleReason) {
        this.rescheduleReason = rescheduleReason;
    }

    public String getDeliverySequence() {
        return deliverySequence;
    }

    public void setDeliverySequence(String deliverySequence) {
        this.deliverySequence = deliverySequence;
    }

    public String getTripPlanning() {
        return tripPlanning;
    }

    public void setTripPlanning(String tripPlanning) {
        this.tripPlanning = tripPlanning;
    }

    public String getLatestNotification() {
        return latestNotification;
    }

    public void setLatestNotification(String latestNotification) {
        this.latestNotification = latestNotification;
    }

    public Integer getDelayInMinutes() {
        return delayInMinutes;
    }

    public void setDelayInMinutes(Integer delayInMinutes) {
        this.delayInMinutes = delayInMinutes;
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

    public Integer getPlannedTrips() {
        return plannedTrips;
    }

    public void setPlannedTrips(Integer plannedTrips) {
        this.plannedTrips = plannedTrips;
    }

    public Integer getCompletedTrips() {
        return completedTrips;
    }

    public void setCompletedTrips(Integer completedTrips) {
        this.completedTrips = completedTrips;
    }

    public Double getTotalFuelUsedLiters() {
        return totalFuelUsedLiters;
    }

    public void setTotalFuelUsedLiters(Double totalFuelUsedLiters) {
        this.totalFuelUsedLiters = totalFuelUsedLiters;
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

    public DeliveryTrackingStatus getDeliveryTrackingStatus() {
        return deliveryTrackingStatus;
    }

    public void setDeliveryTrackingStatus(DeliveryTrackingStatus deliveryTrackingStatus) {
        this.deliveryTrackingStatus = deliveryTrackingStatus;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public void setStatus(OrderStatus status) {
        this.status = status;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public OrderAssignment getAssignment() {
        return assignment;
    }

    public void setAssignment(OrderAssignment assignment) {
        this.assignment = assignment;
    }

    @PrePersist
    public void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
