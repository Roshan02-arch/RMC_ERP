package com.demo.repository;

import com.demo.entity.InventoryPurchaseOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InventoryPurchaseOrderRepository extends JpaRepository<InventoryPurchaseOrder, Long> {
    List<InventoryPurchaseOrder> findAllByOrderByCreatedAtDesc();
    void deleteByRawMaterial_Id(Long rawMaterialId);
}
