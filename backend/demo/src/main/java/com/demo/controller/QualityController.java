package com.demo.controller;

import com.demo.dto.QualityAccessResponse;
import com.demo.entity.Order;
import com.demo.entity.OrderStatus;
import com.demo.repository.OrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/quality")
@CrossOrigin("*")
public class QualityController {

    @Autowired
    private OrderRepository orderRepository;

    @GetMapping("/my-orders/{userId}")
    public List<QualityAccessResponse> getQualityAccessForUser(@PathVariable Long userId) {
        List<Order> orders = orderRepository.findByUserId(userId);
        List<QualityAccessResponse> result = new ArrayList<>();

        for (Order order : orders) {
            if (order.getStatus() == OrderStatus.PENDING_APPROVAL || order.getStatus() == OrderStatus.REJECTED) {
                continue;
            }

            double requiredStrength = getRequiredStrength(order.getGrade());
            double variance = Math.abs(order.getOrderId().hashCode() % 3);
            double slump = 95 + variance * 5;
            double cube7 = round(requiredStrength * 0.72 + variance);
            double cube28 = round(requiredStrength * 1.05 + variance);

            QualityAccessResponse row = new QualityAccessResponse();
            row.setOrderId(order.getOrderId());
            row.setGrade(order.getGrade());
            row.setStatus(order.getStatus().name());
            row.setApprovedMixDesignDetails("Approved as per IS 10262 and plant QC protocol");
            row.setMaterialProportions(getMaterialProportion(order.getGrade()));
            row.setSlumpTestResultMm(round(slump));
            row.setSlumpRequiredRangeMm("75 - 125 mm");
            row.setSlumpWithinStandard(slump >= 75 && slump <= 125);
            row.setRequiredStrengthMpa(requiredStrength);
            row.setCubeStrength7DayMpa(cube7);
            row.setCubeStrength28DayMpa(cube28);
            row.setCube7DayWithinStandard(cube7 >= requiredStrength * 0.65);
            row.setCube28DayWithinStandard(cube28 >= requiredStrength);

            boolean certificateGenerated = order.getStatus() == OrderStatus.DISPATCHED || order.getStatus() == OrderStatus.DELIVERED;
            row.setQualityCertificateGenerated(certificateGenerated);
            row.setQualityCertificateNumber(certificateGenerated ? "QC-" + order.getOrderId() : null);
            row.setQualityCertificateGeneratedAt(certificateGenerated ? LocalDateTime.now().minusDays(1) : null);
            row.setQualityRemarks((row.isSlumpWithinStandard() && row.isCube28DayWithinStandard())
                    ? "Concrete quality meets required standards."
                    : "Under quality review.");

            result.add(row);
        }

        return result;
    }

    private double getRequiredStrength(String grade) {
        if (grade == null) return 20.0;
        return switch (grade.toUpperCase()) {
            case "M25" -> 25.0;
            case "M30" -> 30.0;
            case "M35" -> 35.0;
            default -> 20.0;
        };
    }

    private String getMaterialProportion(String grade) {
        if (grade == null) {
            return "Cement:1, Sand:1.5, Aggregate:3, Water-Cement Ratio:0.45";
        }
        return switch (grade.toUpperCase()) {
            case "M25" -> "Cement:1, Sand:1.2, Aggregate:2.8, Water-Cement Ratio:0.42";
            case "M30" -> "Cement:1, Sand:1.1, Aggregate:2.6, Water-Cement Ratio:0.40";
            case "M35" -> "Cement:1, Sand:1.0, Aggregate:2.4, Water-Cement Ratio:0.38";
            default -> "Cement:1, Sand:1.5, Aggregate:3, Water-Cement Ratio:0.45";
        };
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
