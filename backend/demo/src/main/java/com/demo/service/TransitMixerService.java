package com.demo.service;

import com.demo.entity.TransitMixer;
import java.util.List;

public interface TransitMixerService {

    List<TransitMixer> getAllMixers();

    TransitMixer getMixerById(Long id);

    TransitMixer createMixer(TransitMixer mixer);

    TransitMixer updateMixer(Long id, TransitMixer updatedMixer);

    void deleteMixer(Long id);
}