package com.demo.repository;

import com.demo.entity.SparePart;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SparePartRepository extends JpaRepository<SparePart, Long> {

    Optional<SparePart> findByPartNameIgnoreCase(String partName);

    List<SparePart> findAllByOrderByPartNameAsc();
}
