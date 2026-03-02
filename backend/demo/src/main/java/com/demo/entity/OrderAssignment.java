package com.demo.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "order_assignments")
public class OrderAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String priorityLevel;
    private String plantAllocation;

    // One-to-One with Order
    @OneToOne
    @JoinColumn(name = "order_id")
    private Order order;

    // Main Driver
    @ManyToOne
    @JoinColumn(name = "driver_id")
    private Driver driver;

    // Main Mixer
    @ManyToOne
    @JoinColumn(name = "mixer_id")
    private TransitMixer transitMixer;

    // Backup Driver
    @ManyToOne
    @JoinColumn(name = "backup_driver_id")
    private Driver backupDriver;

    // Backup Mixer
    @ManyToOne
    @JoinColumn(name = "backup_mixer_id")
    private TransitMixer backupMixer;

    // Plant
    @ManyToOne
    @JoinColumn(name = "plant_id")
    private Plant plant;

    // getters & setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getPriorityLevel() {
        return priorityLevel;
    }

    public void setPriorityLevel(String priorityLevel) {
        this.priorityLevel = priorityLevel;
    }

    public String getPlantAllocation() {
        return plantAllocation;
    }

    public void setPlantAllocation(String plantAllocation) {
        this.plantAllocation = plantAllocation;
    }

    public Order getOrder() {
        return order;
    }

    public void setOrder(Order order) {
        this.order = order;
    }

    public Driver getDriver() {
        return driver;
    }

    public void setDriver(Driver driver) {
        this.driver = driver;
    }

    public TransitMixer getTransitMixer() {
        return transitMixer;
    }

    public void setTransitMixer(TransitMixer transitMixer) {
        this.transitMixer = transitMixer;
    }

    public Driver getBackupDriver() {
        return backupDriver;
    }

    public void setBackupDriver(Driver backupDriver) {
        this.backupDriver = backupDriver;
    }

    public TransitMixer getBackupMixer() {
        return backupMixer;
    }

    public void setBackupMixer(TransitMixer backupMixer) {
        this.backupMixer = backupMixer;
    }

    public Plant getPlant() {
        return plant;
    }

    public void setPlant(Plant plant) {
        this.plant = plant;
    }
}