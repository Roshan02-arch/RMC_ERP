package com.demo.dto;

public class VehicleScheduleRequest {

    private String transitMixerNumber;
    private String driverName;
    private String driverShift;
    private String backupTransitMixerNumber;
    private String backupDriverName;

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

    public String getDriverShift() {
        return driverShift;
    }

    public void setDriverShift(String driverShift) {
        this.driverShift = driverShift;
    }

    public String getBackupTransitMixerNumber() {
        return backupTransitMixerNumber;
    }

    public void setBackupTransitMixerNumber(String backupTransitMixerNumber) {
        this.backupTransitMixerNumber = backupTransitMixerNumber;
    }

    public String getBackupDriverName() {
        return backupDriverName;
    }

    public void setBackupDriverName(String backupDriverName) {
        this.backupDriverName = backupDriverName;
    }
}
