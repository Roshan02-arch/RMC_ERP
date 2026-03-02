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

    public List<OrderAssignment> getAssignments() {
        return assignments;
    }

    public void setAssignments(List<OrderAssignment> assignments) {
        this.assignments = assignments;
    }
}