package com.demo.service;

import com.demo.entity.Order;

import java.util.List;

public interface OrderService {

    List<Order> getAllOrders();
    List<Order> getOrdersByUserId(Long userId);

    Order getOrderById(Long id);

    Order getOrderByOrderId(String orderId);

    Order createOrder(Order order);

    Order updateOrder(Long id, Order updatedOrder);

    void deleteOrder(Long id);
}
