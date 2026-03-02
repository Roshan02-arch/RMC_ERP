package com.demo.repository;

import com.demo.entity.TransitMixer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TransitMixerRepository extends JpaRepository<TransitMixer, Long> {

    Optional<TransitMixer> findByMixerNumber(String mixerNumber);

    boolean existsByMixerNumber(String mixerNumber);
}