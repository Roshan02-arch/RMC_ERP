package com.demo.controller;

import com.demo.entity.TransitMixer;
import com.demo.service.TransitMixerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/mixers")
@CrossOrigin("*")
public class TransitMixerController {

    @Autowired
    private TransitMixerService service;

    // GET ALL
    @GetMapping
    public List<TransitMixer> getAllMixers() {
        return service.getAllMixers();
    }

    // GET BY ID
    @GetMapping("/{id}")
    public ResponseEntity<?> getMixerById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(service.getMixerById(id));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // CREATE
    @PostMapping
    public ResponseEntity<?> createMixer(@RequestBody TransitMixer mixer) {
        try {
            TransitMixer saved = service.createMixer(mixer);
            return ResponseEntity.ok(Map.of(
                    "message", "Transit mixer created successfully",
                    "mixerId", saved.getId()
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // UPDATE
    @PutMapping("/{id}")
    public ResponseEntity<?> updateMixer(
            @PathVariable Long id,
            @RequestBody TransitMixer mixer) {

        try {
            service.updateMixer(id, mixer);
            return ResponseEntity.ok(Map.of(
                    "message", "Transit mixer updated successfully"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMixer(@PathVariable Long id) {
        try {
            service.deleteMixer(id);
            return ResponseEntity.ok(Map.of(
                    "message", "Transit mixer deleted successfully"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404)
                    .body(Map.of("message", e.getMessage()));
        }
    }
}