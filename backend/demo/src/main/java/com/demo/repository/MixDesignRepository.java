package com.demo.repository;

import com.demo.entity.MixDesign;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MixDesignRepository extends JpaRepository<MixDesign, Long> {

    Optional<MixDesign> findByMixDesignId(String mixDesignId);

    List<MixDesign> findByApprovedTrueOrderByUpdatedAtDesc();

    List<MixDesign> findByGradeIgnoreCaseAndApprovedTrueOrderByUpdatedAtDesc(String grade);
}
