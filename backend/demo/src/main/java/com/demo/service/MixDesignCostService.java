package com.demo.service;

import com.demo.entity.MixDesignCostLine;
import com.demo.entity.MixDesignCostSheet;
import com.demo.entity.Order;
import com.demo.entity.OrderStatus;
import com.demo.repository.MixDesignCostSheetRepository;
import com.demo.repository.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class MixDesignCostService {

    @Autowired
    private MixDesignCostSheetRepository mixDesignCostSheetRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Transactional
    public void ensureSeedData() {
        if (mixDesignCostSheetRepository.count() > 0) {
            return;
        }

        saveSheet("M7.5", "M-7.5", 2441, 2614,
                line(1, "PFA", "kg", 1.75, 70, 123),
                line(2, "OPC Cement", "kg", 7, 100, 700),
                line(3, "GGBS", "kg", 4.2, 0, 0),
                line(4, "Water", "litre", 0.1, 160, 16),
                line(5, "Crusher Sand", "kg", 0.65, 0, 0),
                line(6, "Wash Sand", "kg", 0.9, 908, 817),
                line(7, "20MM", "kg", 0.7, 721, 505),
                line(8, "10MM", "kg", 0.7, 480, 336),
                line(9, "Admixture", "kg", 59, 2.0, 118)
        );
        saveSheet("M10", "M-10", 2402, 3034,
                line(1, "PFA", "kg", 1.75, 60, 105),
                line(2, "OPC Cement", "kg", 7, 170, 1190),
                line(3, "GGBS", "kg", 4.2, 0, 0),
                line(4, "Water", "litre", 0.1, 170, 17),
                line(5, "Crusher Sand", "kg", 0.65, 0, 0),
                line(6, "Wash Sand", "kg", 0.9, 900, 810),
                line(7, "20MM", "kg", 0.7, 700, 490),
                line(8, "10MM", "kg", 0.7, 400, 280),
                line(9, "Admixture", "kg", 59, 2.4, 142)
        );
        saveSheet("M15", "M-15", 2495, 3288,
                line(1, "PFA", "kg", 1.75, 60, 105),
                line(2, "OPC Cement", "kg", 7, 200, 1400),
                line(3, "GGBS", "kg", 4.2, 0, 0),
                line(4, "Water", "litre", 0.1, 170, 17),
                line(5, "Crusher Sand", "kg", 0.65, 0, 0),
                line(6, "Wash Sand", "kg", 0.9, 930, 837),
                line(7, "20MM", "kg", 0.7, 680, 476),
                line(8, "10MM", "kg", 0.7, 453, 317),
                line(9, "Admixture", "kg", 59, 2.3, 136)
        );
        saveSheet("M20", "M-20", 2454, 3704,
                line(1, "PFA", "kg", 1.75, 60, 105),
                line(2, "OPC Cement", "kg", 7, 270, 1890),
                line(3, "GGBS", "kg", 4.2, 0, 0),
                line(4, "Water", "litre", 0.1, 170, 17),
                line(5, "Crusher Sand", "kg", 0.65, 0, 0),
                line(6, "Wash Sand", "kg", 0.9, 920, 828),
                line(7, "20MM", "kg", 0.7, 620, 434),
                line(8, "10MM", "kg", 0.7, 412, 288),
                line(9, "Admixture", "kg", 59, 2.4, 142)
        );
        saveSheet("M25", "M-25", 2507, 3841,
                line(1, "PFA", "kg", 1.75, 45, 79),
                line(2, "OPC Cement", "kg", 7, 290, 2030),
                line(3, "GGBS", "kg", 4.2, 0, 0),
                line(4, "Water", "litre", 0.1, 170, 17),
                line(5, "Crusher Sand", "kg", 0.65, 0, 0),
                line(6, "Wash Sand", "kg", 0.9, 900, 810),
                line(7, "20MM", "kg", 0.7, 700, 490),
                line(8, "10MM", "kg", 0.7, 400, 280),
                line(9, "Admixture", "kg", 59, 2.3, 136)
        );
        saveSheet("M30", "M-30", 2502, 3964,
                line(1, "PFA", "kg", 1.75, 60, 105),
                line(2, "OPC Cement", "kg", 7, 310, 2170),
                line(3, "GGBS", "kg", 4.2, 0, 0),
                line(4, "Water", "litre", 0.1, 170, 17),
                line(5, "Crusher Sand", "kg", 0.65, 0, 0),
                line(6, "Wash Sand", "kg", 0.9, 850, 765),
                line(7, "20MM", "kg", 0.7, 720, 504),
                line(8, "10MM", "kg", 0.7, 390, 273),
                line(9, "Admixture", "kg", 59, 2.2, 130)
        );
        saveSheet("M35", "M-35", 2613, 4225,
                line(1, "PFA", "kg", 1.75, 100, 175),
                line(2, "OPC Cement", "kg", 7, 330, 2310),
                line(3, "GGBS", "kg", 4.2, 0, 0),
                line(4, "Water", "litre", 0.1, 170, 17),
                line(5, "Crusher Sand", "kg", 0.65, 0, 0),
                line(6, "Wash Sand", "kg", 0.9, 900, 810),
                line(7, "20MM", "kg", 0.7, 700, 490),
                line(8, "10MM", "kg", 0.7, 411, 288),
                line(9, "Admixture", "kg", 59, 2.3, 136)
        );
        saveSheet("M40", "M-40", 2447, 4369,
                line(1, "PFA", "kg", 1.75, 65, 114),
                line(2, "OPC Cement", "kg", 7, 380, 2660),
                line(3, "GGBS", "kg", 4.2, 0, 0),
                line(4, "Water", "litre", 0.1, 170, 17),
                line(5, "Crusher Sand", "kg", 0.65, 0, 0),
                line(6, "Wash Sand", "kg", 0.9, 780, 702),
                line(7, "20MM", "kg", 0.7, 645, 452),
                line(8, "10MM", "kg", 0.7, 405, 284),
                line(9, "Admixture", "kg", 59, 2.4, 142)
        );
    }

    public List<Map<String, Object>> getRelevantOrders() {
        ensureSeedData();
        return orderRepository.findAll().stream()
                .filter(this::isRelevantOrder)
                .sorted(Comparator.comparing(Order::getId).reversed())
                .map(this::toOrderRow)
                .toList();
    }

    public Map<String, Object> calculateForOrder(String orderId) {
        ensureSeedData();

        Order order = orderRepository.findByOrderId(orderId)
                .orElseThrow(() -> new IllegalArgumentException("Order not found"));

        if (!isRelevantOrder(order)) {
            throw new IllegalArgumentException("Mix design costing is available only for approved or active orders");
        }

        String gradeCode = normalizeGradeCode(order.getGrade());
        if (gradeCode == null || gradeCode.isBlank()) {
            throw new IllegalArgumentException("Selected order does not have a valid concrete grade");
        }

        MixDesignCostSheet sheet = mixDesignCostSheetRepository.findByGradeCodeIgnoreCase(gradeCode)
                .orElseThrow(() -> new IllegalArgumentException("No mix design cost master available for grade " + gradeCode));

        double orderQuantity = safe(order.getQuantity());
        List<Map<String, Object>> ingredientRows = new ArrayList<>();
        double totalCostForOrder = round(sheet.getTotalCostPerM3() * orderQuantity);

        double sandQuantityPerM3 = 0;
        double sandCostPerM3 = 0;
        double aggregateQuantityPerM3 = 0;
        double aggregateCostPerM3 = 0;

        for (MixDesignCostLine line : sheet.getLines()) {
            double quantityForOrder = round(line.getQuantityPerM3() * orderQuantity);
            double costForOrder = round(line.getCostPerM3() * orderQuantity);

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("ingredient", line.getIngredientName());
            row.put("unit", line.getUnit());
            row.put("rate", round(line.getRate()));
            row.put("quantityPerM3", round(line.getQuantityPerM3()));
            row.put("costPerM3", round(line.getCostPerM3()));
            row.put("quantityForOrder", quantityForOrder);
            row.put("costForOrder", costForOrder);
            ingredientRows.add(row);

            String key = line.getIngredientName().trim().toUpperCase();
            if (key.contains("SAND")) {
                sandQuantityPerM3 += line.getQuantityPerM3();
                sandCostPerM3 += line.getCostPerM3();
            }
            if ("20MM".equals(key) || "10MM".equals(key)) {
                aggregateQuantityPerM3 += line.getQuantityPerM3();
                aggregateCostPerM3 += line.getCostPerM3();
            }
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("order", toOrderRow(order));
        response.put("sheet", Map.of(
                "gradeCode", sheet.getGradeCode(),
                "gradeLabel", sheet.getGradeLabel()
        ));
        response.put("ingredients", ingredientRows);
        response.put("summary", Map.of(
                "totalDensity", round(sheet.getTotalDensity()),
                "costPerM3", round(sheet.getTotalCostPerM3()),
                "totalCostForOrder", totalCostForOrder,
                "orderQuantity", round(orderQuantity),
                "sandQuantityPerM3", round(sandQuantityPerM3),
                "sandCostPerM3", round(sandCostPerM3),
                "aggregateQuantityPerM3", round(aggregateQuantityPerM3),
                "aggregateCostPerM3", round(aggregateCostPerM3)
        ));
        return response;
    }

    private Map<String, Object> toOrderRow(Order order) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", order.getId());
        row.put("orderId", order.getOrderId());
        row.put("grade", order.getGrade());
        row.put("quantity", round(order.getQuantity()));
        row.put("status", order.getStatus() != null ? order.getStatus().name() : null);
        row.put("customerName", order.getUser() != null ? order.getUser().getName() : null);
        row.put("customerEmail", order.getUser() != null ? order.getUser().getEmail() : null);
        row.put("deliveryDate", order.getDeliveryDate());
        row.put("scheduledDate", order.getScheduledDate());
        row.put("address", order.getAddress());
        return row;
    }

    private boolean isRelevantOrder(Order order) {
        return order.getStatus() != OrderStatus.PENDING_APPROVAL
                && order.getStatus() != OrderStatus.REJECTED;
    }

    private String normalizeGradeCode(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim().toUpperCase().replace(" ", "").replace("-", "");
        return normalized.isBlank() ? null : normalized;
    }

    private double safe(double value) {
        return Double.isFinite(value) ? value : 0;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private void saveSheet(String gradeCode, String gradeLabel, double totalDensity, double totalCostPerM3, MixDesignCostLine... lines) {
        MixDesignCostSheet sheet = new MixDesignCostSheet();
        sheet.setGradeCode(gradeCode);
        sheet.setGradeLabel(gradeLabel);
        sheet.setTotalDensity(totalDensity);
        sheet.setTotalCostPerM3(totalCostPerM3);
        for (MixDesignCostLine line : lines) {
            sheet.addLine(line);
        }
        mixDesignCostSheetRepository.save(sheet);
    }

    private MixDesignCostLine line(int displayOrder, String ingredientName, String unit, double rate, double quantityPerM3, double costPerM3) {
        MixDesignCostLine line = new MixDesignCostLine();
        line.setDisplayOrder(displayOrder);
        line.setIngredientName(ingredientName);
        line.setUnit(unit);
        line.setRate(rate);
        line.setQuantityPerM3(quantityPerM3);
        line.setCostPerM3(costPerM3);
        return line;
    }
}
