package com.demo.service;

import com.demo.entity.Plant;
import com.demo.repository.PlantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PlantServiceImpl implements PlantService {

    @Autowired
    private PlantRepository plantRepository;

    @Override
    public List<Plant> getAllPlants() {
        return plantRepository.findAll();
    }

    @Override
    public Plant getPlantById(Long id) {
        return plantRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Plant not found"));
    }

    @Override
    public Plant createPlant(Plant plant) {

        if (plantRepository.existsByPlantName(plant.getPlantName())) {
            throw new RuntimeException("Plant already exists");
        }

        return plantRepository.save(plant);
    }

    @Override
    public Plant updatePlant(Long id, Plant updatedPlant) {

        Plant plant = plantRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Plant not found"));

        plant.setPlantName(updatedPlant.getPlantName());

        return plantRepository.save(plant);
    }

    @Override
    public void deletePlant(Long id) {

        if (!plantRepository.existsById(id)) {
            throw new RuntimeException("Plant not found");
        }

        plantRepository.deleteById(id);
    }
}