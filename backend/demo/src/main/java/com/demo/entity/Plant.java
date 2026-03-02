package com.demo.entity;

import jakarta.persistence.*;
import java.util.List;



@Entity
@Table(name = "plants")
public class Plant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String plantName;

    @OneToMany(mappedBy = "plant")
    private List<OrderAssignment> assignments;

    // getters & setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getPlantName() {
        return plantName;
    }

    public void setPlantName(String plantName) {
        this.plantName = plantName;
    }

    public List<OrderAssignment> getAssignments() {
        return assignments;
    }

    public void setAssignments(List<OrderAssignment> assignments) {
        this.assignments = assignments;
    }
}