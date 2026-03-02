package com.demo.repository;

import com.demo.entity.OrderAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface OrderAssignmentRepository extends JpaRepository<OrderAssignment, Long> {

    // 🔍 Find assignment by Order ID
    Optional<OrderAssignment> findByOrder_Id(Long orderId);

    // 🔍 Find assignment by Driver ID
    List<OrderAssignment> findByDriver_Id(Long driverId);

    // 🔍 Find assignment by Transit Mixer ID
    List<OrderAssignment> findByTransitMixer_Id(Long mixerId);

    // 🔍 Find assignment by Plant ID
    List<OrderAssignment> findByPlant_Id(Long plantId);

}