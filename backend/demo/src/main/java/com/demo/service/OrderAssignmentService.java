package com.demo.service;

import com.demo.entity.OrderAssignment;

import java.util.List;

public interface OrderAssignmentService {

    List<OrderAssignment> getAllAssignments();

    OrderAssignment getAssignmentById(Long id);

    OrderAssignment getAssignmentByOrderId(Long orderId);

    OrderAssignment createAssignment(OrderAssignment assignment);

    OrderAssignment updateAssignment(Long id, OrderAssignment updatedAssignment);

    void deleteAssignment(Long id);
}