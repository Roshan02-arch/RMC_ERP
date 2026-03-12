package com.demo.entity;

import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "transit_mixers")
public class TransitMixer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String mixerNumber;
    private Double capacityM3;

    @OneToMany(mappedBy = "transitMixer")
    private List<OrderAssignment> assignments;

    // getters & setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getMixerNumber() {
        return mixerNumber;
    }

    public void setMixerNumber(String mixerNumber) {
        this.mixerNumber = mixerNumber;
    }

    public Double getCapacityM3() {
        return capacityM3;
    }

    public void setCapacityM3(Double capacityM3) {
        this.capacityM3 = capacityM3;
    }

    public List<OrderAssignment> getAssignments() {
        return assignments;
    }

    public void setAssignments(List<OrderAssignment> assignments) {
        this.assignments = assignments;
    }
}
