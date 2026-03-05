package com.demo.repository;

import com.demo.entity.RawMaterialOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RawMaterialOrderRepository extends JpaRepository<RawMaterialOrder, Long> {
    List<RawMaterialOrder> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<RawMaterialOrder> findAllByOrderByCreatedAtDesc();
}
