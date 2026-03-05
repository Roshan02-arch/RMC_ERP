package com.demo.repository;

import com.demo.entity.ConcreteProductStock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ConcreteProductStockRepository extends JpaRepository<ConcreteProductStock, Long> {
    Optional<ConcreteProductStock> findByNameIgnoreCase(String name);
}
