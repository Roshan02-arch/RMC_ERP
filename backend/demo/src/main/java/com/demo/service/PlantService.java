package com.demo.service;

import com.demo.entity.Plant;

import java.util.List;

public interface PlantService {

    List<Plant> getAllPlants();

    Plant getPlantById(Long id);

    Plant createPlant(Plant plant);

    Plant updatePlant(Long id, Plant updatedPlant);

    void deletePlant(Long id);
}