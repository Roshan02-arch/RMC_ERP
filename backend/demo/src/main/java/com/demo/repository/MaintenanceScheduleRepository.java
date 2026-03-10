package com.demo.repository;

import com.demo.entity.MaintenanceSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface MaintenanceScheduleRepository extends JpaRepository<MaintenanceSchedule, Long> {

    List<MaintenanceSchedule> findAllByOrderByMaintenanceDateAsc();

    List<MaintenanceSchedule> findByMachineNameContainingIgnoreCaseOrderByMaintenanceDateDesc(String machineName);

    List<MaintenanceSchedule> findByStatusIgnoreCaseOrderByMaintenanceDateAsc(String status);

    List<MaintenanceSchedule> findByStatusIgnoreCaseAndMaintenanceDateBetweenOrderByMaintenanceDateAsc(
            String status,
            LocalDate from,
            LocalDate to
    );
}
