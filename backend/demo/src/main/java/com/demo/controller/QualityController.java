package com.demo.controller;

import com.demo.dto.QualityAccessResponse;
import com.demo.entity.MixDesign;
import com.demo.entity.Order;
import com.demo.entity.OrderStatus;
import com.demo.entity.QualityInspection;
import com.demo.entity.User;
import com.demo.repository.MixDesignRepository;
import com.demo.repository.OrderRepository;
import com.demo.repository.QualityInspectionRepository;
import com.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/quality")
@CrossOrigin("*")
public class QualityController {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private MixDesignRepository mixDesignRepository;

    @Autowired
    private QualityInspectionRepository qualityInspectionRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/my-orders/{userId}")
    public List<QualityAccessResponse> getQualityAccessForUser(@PathVariable Long userId) {
        List<Order> orders = orderRepository.findByUserId(userId);
        List<QualityAccessResponse> result = new ArrayList<>();

        for (Order order : orders) {
            if (order.getStatus() == OrderStatus.PENDING_APPROVAL || order.getStatus() == OrderStatus.REJECTED) {
                continue;
            }
            Optional<QualityInspection> latestInspection = qualityInspectionRepository
                    .findFirstByOrder_IdOrderByRecordedAtDesc(order.getId());
            result.add(toAccessRow(order, latestInspection.orElse(null)));
        }
        return result;
    }

    @GetMapping("/admin/orders")
    public ResponseEntity<?> getOrdersForQualityAdmin(@RequestParam(required = false) Long adminUserId) {
        ResponseEntity<?> adminValidation = validateAdmin(adminUserId);
        if (adminValidation != null) {
            return adminValidation;
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        for (Order order : orderRepository.findAll()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", order.getId());
            row.put("orderId", order.getOrderId());
            row.put("grade", order.getGrade());
            row.put("status", order.getStatus() != null ? order.getStatus().name() : null);
            row.put("quantity", order.getQuantity());
            row.put("customerName", order.getUser() != null ? order.getUser().getName() : null);
            row.put("customerEmail", order.getUser() != null ? order.getUser().getEmail() : null);

            QualityInspection latestInspection = qualityInspectionRepository
                    .findFirstByOrder_IdOrderByRecordedAtDesc(order.getId())
                    .orElse(null);
            row.put("latestInspection", latestInspection == null ? null : toInspectionSummary(latestInspection));
            rows.add(row);
        }
        return ResponseEntity.ok(rows);
    }

    @GetMapping("/admin/mix-designs")
    public ResponseEntity<?> getAllMixDesigns(@RequestParam(required = false) Long adminUserId) {
        ResponseEntity<?> adminValidation = validateAdmin(adminUserId);
        if (adminValidation != null) {
            return adminValidation;
        }
        return ResponseEntity.ok(mixDesignRepository.findAll().stream().map(this::toMixDesignView).toList());
    }

    @GetMapping("/admin/mix-designs/approved")
    public ResponseEntity<?> getApprovedMixDesigns(
            @RequestParam(required = false) Long adminUserId,
            @RequestParam(required = false) String grade
    ) {
        ResponseEntity<?> adminValidation = validateAdmin(adminUserId);
        if (adminValidation != null) {
            return adminValidation;
        }

        List<MixDesign> mixDesigns;
        if (grade != null && !grade.isBlank()) {
            mixDesigns = mixDesignRepository.findByGradeIgnoreCaseAndApprovedTrueOrderByUpdatedAtDesc(grade);
        } else {
            mixDesigns = mixDesignRepository.findByApprovedTrueOrderByUpdatedAtDesc();
        }
        return ResponseEntity.ok(mixDesigns.stream().map(this::toMixDesignView).toList());
    }

    @PostMapping("/admin/mix-designs")
    public ResponseEntity<?> createMixDesign(
            @RequestParam(required = false) Long adminUserId,
            @RequestBody Map<String, Object> payload
    ) {
        ResponseEntity<?> adminValidation = validateAdmin(adminUserId);
        if (adminValidation != null) {
            return adminValidation;
        }

        String grade = toStringValue(payload.get("grade"));
        if (grade == null || grade.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "grade is required"));
        }

        MixDesign mix = new MixDesign();
        mix.setGrade(grade.trim().toUpperCase());
        mix.setCement(toDouble(payload.get("cement"), 0));
        mix.setSand(toDouble(payload.get("sand"), 0));
        mix.setAggregate(toDouble(payload.get("aggregate"), 0));
        mix.setWater(toDouble(payload.get("water"), 0));
        mix.setAdmixtures(toDouble(payload.get("admixtures"), 0));
        mix.setRequiredStrengthMpa(toDouble(payload.get("requiredStrengthMpa"), requiredStrengthForGrade(grade)));
        mix.setSlumpMinMm(toDouble(payload.get("slumpMinMm"), 75));
        mix.setSlumpMaxMm(toDouble(payload.get("slumpMaxMm"), 125));
        mix.setApprovalRemarks(toStringValue(payload.get("approvalRemarks")));
        mix.setApproved(false);
        mix.setApprovedAt(null);

        MixDesign saved = mixDesignRepository.save(mix);
        return ResponseEntity.ok(Map.of(
                "message", "Mix design created successfully",
                "mixDesign", toMixDesignView(saved)
        ));
    }

    @PutMapping("/admin/mix-designs/{id}")
    public ResponseEntity<?> updateMixDesign(
            @PathVariable Long id,
            @RequestParam(required = false) Long adminUserId,
            @RequestBody Map<String, Object> payload
    ) {
        ResponseEntity<?> adminValidation = validateAdmin(adminUserId);
        if (adminValidation != null) {
            return adminValidation;
        }

        MixDesign mix = mixDesignRepository.findById(id).orElse(null);
        if (mix == null) {
            return ResponseEntity.status(404).body(Map.of("message", "Mix design not found"));
        }

        String grade = toStringValue(payload.get("grade"));
        if (grade != null && !grade.isBlank()) {
            mix.setGrade(grade.trim().toUpperCase());
        }

        if (payload.containsKey("cement")) mix.setCement(toDouble(payload.get("cement"), mix.getCement()));
        if (payload.containsKey("sand")) mix.setSand(toDouble(payload.get("sand"), mix.getSand()));
        if (payload.containsKey("aggregate")) mix.setAggregate(toDouble(payload.get("aggregate"), mix.getAggregate()));
        if (payload.containsKey("water")) mix.setWater(toDouble(payload.get("water"), mix.getWater()));
        if (payload.containsKey("admixtures")) mix.setAdmixtures(toDouble(payload.get("admixtures"), mix.getAdmixtures()));
        if (payload.containsKey("requiredStrengthMpa")) {
            mix.setRequiredStrengthMpa(toDouble(payload.get("requiredStrengthMpa"), mix.getRequiredStrengthMpa()));
        }
        if (payload.containsKey("slumpMinMm")) mix.setSlumpMinMm(toDouble(payload.get("slumpMinMm"), mix.getSlumpMinMm()));
        if (payload.containsKey("slumpMaxMm")) mix.setSlumpMaxMm(toDouble(payload.get("slumpMaxMm"), mix.getSlumpMaxMm()));
        mix.setApprovalRemarks(toStringValue(payload.get("approvalRemarks")));

        // Any modification needs approval again.
        mix.setApproved(false);
        mix.setApprovedAt(null);

        MixDesign saved = mixDesignRepository.save(mix);
        return ResponseEntity.ok(Map.of(
                "message", "Mix design updated successfully. Re-approval required.",
                "mixDesign", toMixDesignView(saved)
        ));
    }

    @PutMapping("/admin/mix-designs/{id}/approve")
    public ResponseEntity<?> approveMixDesign(
            @PathVariable Long id,
            @RequestParam(required = false) Long adminUserId,
            @RequestBody(required = false) Map<String, Object> payload
    ) {
        ResponseEntity<?> adminValidation = validateAdmin(adminUserId);
        if (adminValidation != null) {
            return adminValidation;
        }

        MixDesign mix = mixDesignRepository.findById(id).orElse(null);
        if (mix == null) {
            return ResponseEntity.status(404).body(Map.of("message", "Mix design not found"));
        }

        boolean approved = true;
        if (payload != null && payload.containsKey("approved")) {
            approved = Boolean.parseBoolean(String.valueOf(payload.get("approved")));
        }

        mix.setApproved(approved);
        mix.setApprovalRemarks(payload == null ? mix.getApprovalRemarks() : toStringValue(payload.get("approvalRemarks")));
        mix.setApprovedAt(approved ? LocalDateTime.now() : null);

        MixDesign saved = mixDesignRepository.save(mix);
        return ResponseEntity.ok(Map.of(
                "message", approved ? "Mix design approved" : "Mix design marked as not approved",
                "mixDesign", toMixDesignView(saved)
        ));
    }

    @GetMapping("/admin/inspections")
    public ResponseEntity<?> getInspections(
            @RequestParam(required = false) Long adminUserId,
            @RequestParam(required = false) String orderId
    ) {
        ResponseEntity<?> adminValidation = validateAdmin(adminUserId);
        if (adminValidation != null) {
            return adminValidation;
        }

        if (orderId != null && !orderId.isBlank()) {
            Order order = orderRepository.findByOrderId(orderId).orElse(null);
            if (order == null) {
                return ResponseEntity.status(404).body(Map.of("message", "Order not found"));
            }
            List<Map<String, Object>> rows = qualityInspectionRepository.findByOrder_IdOrderByRecordedAtDesc(order.getId())
                    .stream()
                    .map(this::toInspectionView)
                    .toList();
            return ResponseEntity.ok(rows);
        }

        return ResponseEntity.ok(qualityInspectionRepository.findAllByOrderByRecordedAtDesc().stream().map(this::toInspectionView).toList());
    }

    @GetMapping("/admin/orders/{orderId}/history")
    public ResponseEntity<?> getOrderQualityHistory(
            @PathVariable String orderId,
            @RequestParam(required = false) Long adminUserId
    ) {
        ResponseEntity<?> adminValidation = validateAdmin(adminUserId);
        if (adminValidation != null) {
            return adminValidation;
        }

        Order order = orderRepository.findByOrderId(orderId).orElse(null);
        if (order == null) {
            return ResponseEntity.status(404).body(Map.of("message", "Order not found"));
        }

        List<Map<String, Object>> history = qualityInspectionRepository.findByOrder_IdOrderByRecordedAtDesc(order.getId())
                .stream()
                .map(this::toInspectionView)
                .toList();

        return ResponseEntity.ok(Map.of(
                "orderId", order.getOrderId(),
                "history", history
        ));
    }

    @PostMapping("/admin/inspections")
    public ResponseEntity<?> createInspection(
            @RequestParam(required = false) Long adminUserId,
            @RequestBody Map<String, Object> payload
    ) {
        ResponseEntity<?> adminValidation = validateAdmin(adminUserId);
        if (adminValidation != null) {
            return adminValidation;
        }

        String orderId = toStringValue(payload.get("orderId"));
        if (orderId == null || orderId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "orderId is required"));
        }

        Order order = orderRepository.findByOrderId(orderId).orElse(null);
        if (order == null) {
            return ResponseEntity.status(404).body(Map.of("message", "Order not found"));
        }

        if (order.getStatus() == OrderStatus.PENDING_APPROVAL || order.getStatus() == OrderStatus.REJECTED) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Quality tests can be recorded only for approved/active production orders"
            ));
        }

        String mixDesignId = toStringValue(payload.get("mixDesignId"));
        MixDesign mix = null;
        if (mixDesignId != null && !mixDesignId.isBlank()) {
            mix = mixDesignRepository.findByMixDesignId(mixDesignId).orElse(null);
        }
        if (mix == null && payload.get("mixDesignDbId") != null) {
            Long dbId = toLong(payload.get("mixDesignDbId"), null);
            if (dbId != null) {
                mix = mixDesignRepository.findById(dbId).orElse(null);
            }
        }
        if (mix == null) {
            List<MixDesign> fallback = mixDesignRepository.findByGradeIgnoreCaseAndApprovedTrueOrderByUpdatedAtDesc(order.getGrade());
            if (!fallback.isEmpty()) {
                mix = fallback.get(0);
            }
        }

        if (mix == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "No approved mix design found for order grade"));
        }
        if (!mix.isApproved()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Only approved mix design can be used in production"));
        }

        QualityInspection inspection = new QualityInspection();
        inspection.setInspectionNumber("QIN-" + order.getOrderId() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        inspection.setOrder(order);
        inspection.setMixDesign(mix);
        inspection.setBatchCode(toStringValue(payload.get("batchCode")));
        inspection.setRecordedByAdminId(adminUserId);

        double slumpResult = toDouble(payload.get("slumpTestResultMm"), 0);
        double slumpMin = mix.getSlumpMinMm() > 0 ? mix.getSlumpMinMm() : 75;
        double slumpMax = mix.getSlumpMaxMm() > 0 ? mix.getSlumpMaxMm() : 125;
        inspection.setSlumpTestResultMm(slumpResult);
        inspection.setSlumpMinMm(slumpMin);
        inspection.setSlumpMaxMm(slumpMax);
        inspection.setSlumpWithinStandard(slumpResult >= slumpMin && slumpResult <= slumpMax);

        double requiredStrength = mix.getRequiredStrengthMpa() > 0 ? mix.getRequiredStrengthMpa() : requiredStrengthForGrade(order.getGrade());
        double cube7 = toDouble(payload.get("cubeStrength7DayMpa"), 0);
        double cube14 = toDouble(payload.get("cubeStrength14DayMpa"), 0);
        double cube28 = toDouble(payload.get("cubeStrength28DayMpa"), 0);

        inspection.setRequiredStrengthMpa(requiredStrength);
        inspection.setCubeStrength7DayMpa(cube7);
        inspection.setCubeStrength14DayMpa(cube14);
        inspection.setCubeStrength28DayMpa(cube28);
        inspection.setCube7DayWithinStandard(cube7 >= requiredStrength * 0.65);
        inspection.setCube14DayWithinStandard(cube14 >= requiredStrength * 0.9);
        inspection.setCube28DayWithinStandard(cube28 >= requiredStrength);

        boolean passed = inspection.isSlumpWithinStandard() && inspection.isCube28DayWithinStandard();
        inspection.setCompliancePassed(passed);
        inspection.setQualityCertificateGenerated(false);
        inspection.setQualityCertificateNumber(null);
        inspection.setQualityCertificateGeneratedAt(null);
        inspection.setQualityRemarks(toStringValue(payload.get("qualityRemarks")));

        QualityInspection saved = qualityInspectionRepository.save(inspection);
        return ResponseEntity.ok(Map.of(
                "message", "Quality inspection recorded successfully",
                "inspection", toInspectionView(saved)
        ));
    }

    @PutMapping("/admin/inspections/{id}/certificate")
    public ResponseEntity<?> generateCertificate(
            @PathVariable Long id,
            @RequestParam(required = false) Long adminUserId,
            @RequestBody(required = false) Map<String, Object> payload
    ) {
        ResponseEntity<?> adminValidation = validateAdmin(adminUserId);
        if (adminValidation != null) {
            return adminValidation;
        }

        QualityInspection inspection = qualityInspectionRepository.findById(id).orElse(null);
        if (inspection == null) {
            return ResponseEntity.status(404).body(Map.of("message", "Inspection not found"));
        }

        if (!inspection.isCompliancePassed()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Certificate can be generated only after compliance pass"
            ));
        }

        if (!inspection.isQualityCertificateGenerated()) {
            inspection.setQualityCertificateGenerated(true);
            inspection.setQualityCertificateNumber("QC-" + inspection.getOrder().getOrderId() + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
            inspection.setQualityCertificateGeneratedAt(LocalDateTime.now());
        }
        if (payload != null && payload.containsKey("qualityRemarks")) {
            inspection.setQualityRemarks(toStringValue(payload.get("qualityRemarks")));
        }

        QualityInspection saved = qualityInspectionRepository.save(inspection);
        return ResponseEntity.ok(Map.of(
                "message", "Quality certificate generated",
                "inspection", toInspectionView(saved)
        ));
    }

    private ResponseEntity<?> validateAdmin(Long adminUserId) {
        if (adminUserId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "adminUserId is required"));
        }

        User adminUser = userRepository.findById(adminUserId).orElse(null);
        if (adminUser == null) {
            return ResponseEntity.status(404).body(Map.of("message", "Admin user not found"));
        }
        if (!"ADMIN".equalsIgnoreCase(adminUser.getRole())) {
            return ResponseEntity.status(403).body(Map.of("message", "Only admin can perform this action"));
        }
        if (adminUser.getApprovalStatus() != null
                && !adminUser.getApprovalStatus().isBlank()
                && !"APPROVED".equalsIgnoreCase(adminUser.getApprovalStatus())) {
            return ResponseEntity.status(403).body(Map.of("message", "Admin account is not approved"));
        }
        return null;
    }

    private Map<String, Object> toMixDesignView(MixDesign mix) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", mix.getId());
        row.put("mixDesignId", mix.getMixDesignId());
        row.put("grade", mix.getGrade());
        row.put("cement", mix.getCement());
        row.put("sand", mix.getSand());
        row.put("aggregate", mix.getAggregate());
        row.put("water", mix.getWater());
        row.put("admixtures", mix.getAdmixtures());
        row.put("requiredStrengthMpa", mix.getRequiredStrengthMpa());
        row.put("slumpMinMm", mix.getSlumpMinMm());
        row.put("slumpMaxMm", mix.getSlumpMaxMm());
        row.put("approved", mix.isApproved());
        row.put("approvalRemarks", mix.getApprovalRemarks());
        row.put("approvedAt", mix.getApprovedAt());
        row.put("createdAt", mix.getCreatedAt());
        row.put("updatedAt", mix.getUpdatedAt());
        row.put("materialProportions", buildMaterialProportions(mix));
        return row;
    }

    private Map<String, Object> toInspectionView(QualityInspection inspection) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", inspection.getId());
        row.put("inspectionNumber", inspection.getInspectionNumber());
        row.put("orderId", inspection.getOrder() != null ? inspection.getOrder().getOrderId() : null);
        row.put("grade", inspection.getOrder() != null ? inspection.getOrder().getGrade() : null);
        row.put("batchCode", inspection.getBatchCode());
        row.put("mixDesignId", inspection.getMixDesign() != null ? inspection.getMixDesign().getMixDesignId() : null);
        row.put("materialProportions", inspection.getMixDesign() == null ? null : buildMaterialProportions(inspection.getMixDesign()));
        row.put("slumpTestResultMm", inspection.getSlumpTestResultMm());
        row.put("slumpRequiredRangeMm", formatRange(inspection.getSlumpMinMm(), inspection.getSlumpMaxMm()));
        row.put("slumpWithinStandard", inspection.isSlumpWithinStandard());
        row.put("requiredStrengthMpa", inspection.getRequiredStrengthMpa());
        row.put("cubeStrength7DayMpa", inspection.getCubeStrength7DayMpa());
        row.put("cubeStrength14DayMpa", inspection.getCubeStrength14DayMpa());
        row.put("cubeStrength28DayMpa", inspection.getCubeStrength28DayMpa());
        row.put("cube7DayWithinStandard", inspection.isCube7DayWithinStandard());
        row.put("cube14DayWithinStandard", inspection.isCube14DayWithinStandard());
        row.put("cube28DayWithinStandard", inspection.isCube28DayWithinStandard());
        row.put("compliancePassed", inspection.isCompliancePassed());
        row.put("qualityCertificateGenerated", inspection.isQualityCertificateGenerated());
        row.put("qualityCertificateNumber", inspection.getQualityCertificateNumber());
        row.put("qualityCertificateGeneratedAt", inspection.getQualityCertificateGeneratedAt());
        row.put("qualityRemarks", inspection.getQualityRemarks());
        row.put("recordedByAdminId", inspection.getRecordedByAdminId());
        row.put("recordedAt", inspection.getRecordedAt());
        row.put("updatedAt", inspection.getUpdatedAt());
        return row;
    }

    private Map<String, Object> toInspectionSummary(QualityInspection inspection) {
        Map<String, Object> row = new HashMap<>();
        row.put("id", inspection.getId());
        row.put("inspectionNumber", inspection.getInspectionNumber());
        row.put("compliancePassed", inspection.isCompliancePassed());
        row.put("qualityCertificateGenerated", inspection.isQualityCertificateGenerated());
        row.put("qualityCertificateNumber", inspection.getQualityCertificateNumber());
        row.put("recordedAt", inspection.getRecordedAt());
        return row;
    }

    private QualityAccessResponse toAccessRow(Order order, QualityInspection inspection) {
        QualityAccessResponse row = new QualityAccessResponse();
        row.setOrderId(order.getOrderId());
        row.setGrade(order.getGrade());
        row.setStatus(order.getStatus() != null ? order.getStatus().name() : "-");

        if (inspection == null) {
            MixDesign mix = latestApprovedMixForGrade(order.getGrade());
            double requiredStrength = mix != null && mix.getRequiredStrengthMpa() > 0
                    ? mix.getRequiredStrengthMpa()
                    : requiredStrengthForGrade(order.getGrade());
            row.setInspectionNumber(null);
            row.setMixDesignId(mix != null ? mix.getMixDesignId() : null);
            row.setApprovedMixDesignDetails(mix != null ? "Awaiting QC tests" : "Mix design pending approval");
            row.setMaterialProportions(mix != null ? buildMaterialProportions(mix) : "-");
            row.setSlumpTestResultMm(0);
            row.setSlumpRequiredRangeMm(mix != null ? formatRange(mix.getSlumpMinMm(), mix.getSlumpMaxMm()) : "75 - 125 mm");
            row.setSlumpWithinStandard(false);
            row.setRequiredStrengthMpa(requiredStrength);
            row.setCubeStrength7DayMpa(0);
            row.setCubeStrength14DayMpa(0);
            row.setCubeStrength28DayMpa(0);
            row.setCube7DayWithinStandard(false);
            row.setCube14DayWithinStandard(false);
            row.setCube28DayWithinStandard(false);
            row.setQualityCertificateGenerated(false);
            row.setQualityCertificateNumber(null);
            row.setQualityCertificateGeneratedAt(null);
            row.setQualityRemarks("Quality tests are pending admin recording.");
            return row;
        }

        row.setInspectionNumber(inspection.getInspectionNumber());
        row.setMixDesignId(inspection.getMixDesign() != null ? inspection.getMixDesign().getMixDesignId() : null);
        row.setApprovedMixDesignDetails("Approved as per plant quality control");
        row.setMaterialProportions(inspection.getMixDesign() == null ? "-" : buildMaterialProportions(inspection.getMixDesign()));
        row.setSlumpTestResultMm(round(inspection.getSlumpTestResultMm()));
        row.setSlumpRequiredRangeMm(formatRange(inspection.getSlumpMinMm(), inspection.getSlumpMaxMm()));
        row.setSlumpWithinStandard(inspection.isSlumpWithinStandard());
        row.setRequiredStrengthMpa(round(inspection.getRequiredStrengthMpa()));
        row.setCubeStrength7DayMpa(round(inspection.getCubeStrength7DayMpa()));
        row.setCubeStrength14DayMpa(round(inspection.getCubeStrength14DayMpa()));
        row.setCubeStrength28DayMpa(round(inspection.getCubeStrength28DayMpa()));
        row.setCube7DayWithinStandard(inspection.isCube7DayWithinStandard());
        row.setCube14DayWithinStandard(inspection.isCube14DayWithinStandard());
        row.setCube28DayWithinStandard(inspection.isCube28DayWithinStandard());
        row.setQualityCertificateGenerated(inspection.isQualityCertificateGenerated());
        row.setQualityCertificateNumber(inspection.getQualityCertificateNumber());
        row.setQualityCertificateGeneratedAt(inspection.getQualityCertificateGeneratedAt());
        row.setQualityRemarks(inspection.getQualityRemarks() == null || inspection.getQualityRemarks().isBlank()
                ? (inspection.isCompliancePassed()
                ? "Concrete quality meets required standards."
                : "Quality deviation observed. Corrective action in progress.")
                : inspection.getQualityRemarks());
        return row;
    }

    private MixDesign latestApprovedMixForGrade(String grade) {
        List<MixDesign> list = mixDesignRepository.findByGradeIgnoreCaseAndApprovedTrueOrderByUpdatedAtDesc(grade);
        return list.isEmpty() ? null : list.get(0);
    }

    private String buildMaterialProportions(MixDesign mix) {
        return "Cement:" + round(mix.getCement())
                + ", Sand:" + round(mix.getSand())
                + ", Aggregate:" + round(mix.getAggregate())
                + ", Water:" + round(mix.getWater())
                + ", Admixtures:" + round(mix.getAdmixtures());
    }

    private String formatRange(double min, double max) {
        return round(min) + " - " + round(max) + " mm";
    }

    private double requiredStrengthForGrade(String grade) {
        if (grade == null) return 20.0;
        return switch (grade.trim().toUpperCase()) {
            case "M25" -> 25.0;
            case "M30" -> 30.0;
            case "M35" -> 35.0;
            case "M40" -> 40.0;
            case "M45" -> 45.0;
            case "M50" -> 50.0;
            default -> 20.0;
        };
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private String toStringValue(Object value) {
        if (value == null) {
            return null;
        }
        return String.valueOf(value).trim();
    }

    private double toDouble(Object value, double defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    private Long toLong(Object value, Long defaultValue) {
        if (value == null) {
            return defaultValue;
        }
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }
}
