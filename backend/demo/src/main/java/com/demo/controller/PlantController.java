package com.demo.controller;

import com.demo.entity.Plant;
import com.demo.service.PlantService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/plants")
@CrossOrigin("*")
public class PlantController {

    @Autowired
    private PlantService plantService;

    // GET ALL
    @GetMapping
    public List<Plant> getAllPlants() {
        return plantService.getAllPlants();
    }

    // GET BY ID
    @GetMapping("/{id}")
    public ResponseEntity<?> getPlantById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(plantService.getPlantById(id));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // CREATE
    @PostMapping
    public ResponseEntity<?> createPlant(@RequestBody Plant plant) {
        try {
            Plant saved = plantService.createPlant(plant);
            return ResponseEntity.ok(Map.of(
                    "message", "Plant created successfully",
                    "plantId", saved.getId()
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // UPDATE
    @PutMapping("/{id}")
    public ResponseEntity<?> updatePlant(
            @PathVariable Long id,
            @RequestBody Plant plant) {

        try {
            plantService.updatePlant(id, plant);
            return ResponseEntity.ok(Map.of(
                    "message", "Plant updated successfully"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePlant(@PathVariable Long id) {
        try {
            plantService.deletePlant(id);
            return ResponseEntity.ok(Map.of(
                    "message", "Plant deleted successfully"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404)
                    .body(Map.of("message", e.getMessage()));
        }
    }
}