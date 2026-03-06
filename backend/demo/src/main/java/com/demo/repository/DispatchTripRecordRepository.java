package com.demo.repository;

import com.demo.entity.DispatchTripRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DispatchTripRecordRepository extends JpaRepository<DispatchTripRecord, Long> {

    List<DispatchTripRecord> findByOrder_IdOrderByTripNumberAsc(Long orderId);

    Optional<DispatchTripRecord> findByOrder_IdAndTripNumber(Long orderId, Integer tripNumber);

    void deleteByOrder_Id(Long orderId);
}
