package com.demo.entity;

import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "drivers")
public class Driver {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String driverName;
    private String driverShift;

    @OneToMany(mappedBy = "driver")
    private List<OrderAssignment> assignments;

    // getters & setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public List<OrderAssignment> getAssignments() {
        return assignments;
    }

    public void setAssignments(List<OrderAssignment> assignments) {
        this.assignments = assignments;
    }
}