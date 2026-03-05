package com.demo.repository;

import com.demo.entity.InventoryMovement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface InventoryMovementRepository extends JpaRepository<InventoryMovement, Long> {
    List<InventoryMovement> findByCreatedAtBetweenOrderByCreatedAtDesc(LocalDateTime start, LocalDateTime end);
    List<InventoryMovement> findByRawMaterial_IdAndCreatedAtBetweenOrderByCreatedAtDesc(Long rawMaterialId, LocalDateTime start, LocalDateTime end);
    List<InventoryMovement> findByRawMaterial_IdOrderByCreatedAtDesc(Long rawMaterialId);
}
