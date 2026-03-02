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
}
