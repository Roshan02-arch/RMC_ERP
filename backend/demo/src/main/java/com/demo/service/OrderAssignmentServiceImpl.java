package com.demo.service;

import com.demo.entity.OrderAssignment;
import com.demo.repository.OrderAssignmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class OrderAssignmentServiceImpl implements OrderAssignmentService {

    @Autowired
    private OrderAssignmentRepository repository;

    @Override
    public List<OrderAssignment> getAllAssignments() {
        return repository.findAll();
    }

    @Override
    public OrderAssignment getAssignmentById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assignment not found"));
    }

    @Override
    public OrderAssignment getAssignmentByOrderId(Long orderId) {
        return repository.findByOrder_Id(orderId)
                .orElseThrow(() -> new RuntimeException("Assignment not found"));
    }

    @Override
    public OrderAssignment createAssignment(OrderAssignment assignment) {
        return repository.save(assignment);
    }

    @Override
    public OrderAssignment updateAssignment(Long id, OrderAssignment updatedAssignment) {

        OrderAssignment existing = getAssignmentById(id);

        existing.setPriorityLevel(updatedAssignment.getPriorityLevel());
        existing.setPlantAllocation(updatedAssignment.getPlantAllocation());
        existing.setDriver(updatedAssignment.getDriver());
        existing.setTransitMixer(updatedAssignment.getTransitMixer());
        existing.setBackupDriver(updatedAssignment.getBackupDriver());
        existing.setBackupMixer(updatedAssignment.getBackupMixer());
        existing.setPlant(updatedAssignment.getPlant());

        return repository.save(existing);
    }

    @Override
    public void deleteAssignment(Long id) {
        repository.deleteById(id);
    }
}