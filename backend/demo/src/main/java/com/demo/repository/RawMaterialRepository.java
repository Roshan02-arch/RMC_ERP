package com.demo.repository;

import com.demo.entity.RawMaterial;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RawMaterialRepository extends JpaRepository<RawMaterial, Long> {
    Optional<RawMaterial> findByNameIgnoreCase(String name);
    List<RawMaterial> findByQuantityLessThan(double quantity);
}
