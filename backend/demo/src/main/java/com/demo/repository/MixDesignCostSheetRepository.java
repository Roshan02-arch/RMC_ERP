package com.demo.repository;

import com.demo.entity.MixDesignCostSheet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MixDesignCostSheetRepository extends JpaRepository<MixDesignCostSheet, Long> {
    Optional<MixDesignCostSheet> findByGradeCodeIgnoreCase(String gradeCode);
}
