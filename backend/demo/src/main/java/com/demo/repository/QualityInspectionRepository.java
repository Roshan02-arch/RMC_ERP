package com.demo.repository;

import com.demo.entity.QualityInspection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QualityInspectionRepository extends JpaRepository<QualityInspection, Long> {

    List<QualityInspection> findByOrder_IdOrderByRecordedAtDesc(Long orderId);

    Optional<QualityInspection> findFirstByOrder_IdOrderByRecordedAtDesc(Long orderId);

    List<QualityInspection> findAllByOrderByRecordedAtDesc();

    void deleteByOrder_Id(Long orderId);
}
