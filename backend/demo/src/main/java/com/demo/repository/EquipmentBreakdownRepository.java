package com.demo.repository;

import com.demo.entity.EquipmentBreakdown;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface EquipmentBreakdownRepository extends JpaRepository<EquipmentBreakdown, Long> {

    List<EquipmentBreakdown> findAllByOrderByBreakdownTimeDesc();

    List<EquipmentBreakdown> findByBreakdownTimeBetween(LocalDateTime from, LocalDateTime to);
}
