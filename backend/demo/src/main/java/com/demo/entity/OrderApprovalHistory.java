package com.demo.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "order_approval_history")
public class OrderApprovalHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String orderId;

    @Column(nullable = false)
    private String status;

    private String actionBy;

    @Column(nullable = false)
    private LocalDateTime actionTime;

    @Column(length = 1000)
    private String remarks;

    public OrderApprovalHistory() {}

    public OrderApprovalHistory(String orderId, String status, String actionBy, LocalDateTime actionTime, String remarks) {
        this.orderId = orderId;
        this.status = status;
        this.actionBy = actionBy;
        this.actionTime = actionTime;
        this.remarks = remarks;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getActionBy() { return actionBy; }
    public void setActionBy(String actionBy) { this.actionBy = actionBy; }

    public LocalDateTime getActionTime() { return actionTime; }
    public void setActionTime(LocalDateTime actionTime) { this.actionTime = actionTime; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
}
