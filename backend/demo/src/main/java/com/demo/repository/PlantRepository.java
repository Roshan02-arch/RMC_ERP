package com.demo.repository;

import com.demo.entity.Plant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PlantRepository extends JpaRepository<Plant, Long> {

    Optional<Plant> findByPlantName(String plantName);

    boolean existsByPlantName(String plantName);
}