package com.demo.repository;

import com.demo.entity.SparePartUsage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SparePartUsageRepository extends JpaRepository<SparePartUsage, Long> {

    List<SparePartUsage> findAllByOrderByUsedAtDesc();

    List<SparePartUsage> findBySparePart_IdOrderByUsedAtDesc(Long sparePartId);
}
