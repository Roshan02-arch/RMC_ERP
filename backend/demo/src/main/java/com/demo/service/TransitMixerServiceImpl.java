package com.demo.service;

import com.demo.entity.TransitMixer;
import com.demo.repository.TransitMixerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TransitMixerServiceImpl implements TransitMixerService {

    @Autowired
    private TransitMixerRepository repository;

    @Override
    public List<TransitMixer> getAllMixers() {
        return repository.findAll();
    }

    @Override
    public TransitMixer getMixerById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transit mixer not found"));
    }

    @Override
    public TransitMixer createMixer(TransitMixer mixer) {

        if (repository.existsByMixerNumber(mixer.getMixerNumber())) {
            throw new RuntimeException("Mixer already exists");
        }

        return repository.save(mixer);
    }

    @Override
    public TransitMixer updateMixer(Long id, TransitMixer updatedMixer) {

        TransitMixer mixer = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transit mixer not found"));

        mixer.setMixerNumber(updatedMixer.getMixerNumber());

        return repository.save(mixer);
    }

    @Override
    public void deleteMixer(Long id) {

        if (!repository.existsById(id)) {
            throw new RuntimeException("Transit mixer not found");
        }

        repository.deleteById(id);
    }
}