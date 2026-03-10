package com.demo.controller;

import com.demo.entity.EquipmentBreakdown;
import com.demo.entity.MaintenanceSchedule;
import com.demo.entity.SparePart;
import com.demo.entity.SparePartUsage;
import com.demo.repository.EquipmentBreakdownRepository;
import com.demo.repository.MaintenanceScheduleRepository;
import com.demo.repository.SparePartRepository;
import com.demo.repository.SparePartUsageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/maintenance")
@CrossOrigin("*")
public class MaintenanceController {

    @Autowired
    private MaintenanceScheduleRepository scheduleRepository;

    @Autowired
    private EquipmentBreakdownRepository breakdownRepository;

    @Autowired
    private SparePartRepository sparePartRepository;

    @Autowired
    private SparePartUsageRepository sparePartUsageRepository;

    @GetMapping("/dashboard")
    public Map<String, Object> dashboard() {
        List<MaintenanceSchedule> schedules = scheduleRepository.findAll();
        List<EquipmentBreakdown> breakdowns = breakdownRepository.findAll();
        List<SparePart> parts = sparePartRepository.findAll();

        long activeSchedules = schedules.stream().filter(s -> !isCompleted(s.getStatus())).count();
        long openBreakdowns = breakdowns.stream().filter(b -> !isResolved(b.getStatus())).count();
        long lowStockParts = parts.stream().filter(p -> p.getQuantityInStock() <= p.getMinimumStockLevel()).count();
        double downtime = round2(breakdowns.stream().mapToDouble(this::effectiveDowntimeHours).sum());

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("totalSchedules", schedules.size());
        out.put("activeSchedules", activeSchedules);
        out.put("openBreakdowns", openBreakdowns);
        out.put("lowStockParts", lowStockParts);
        out.put("totalDowntimeHours", downtime);
        out.put("upcomingReminderCount", reminderRows(7).size());
        return out;
    }

    @GetMapping("/schedules")
    public List<Map<String, Object>> schedules(@RequestParam(required = false) String machineName) {
        List<MaintenanceSchedule> rows = (machineName != null && !machineName.isBlank())
                ? scheduleRepository.findByMachineNameContainingIgnoreCaseOrderByMaintenanceDateDesc(machineName.trim())
                : scheduleRepository.findAllByOrderByMaintenanceDateAsc();
        return rows.stream().map(this::scheduleView).collect(Collectors.toList());
    }

    @PostMapping("/schedules")
    public ResponseEntity<?> createSchedule(@RequestBody Map<String, Object> payload) {
        String machineName = str(payload.get("machineName"));
        String equipmentType = str(payload.get("equipmentType"));
        LocalDate maintenanceDate = parseDate(payload.get("maintenanceDate"));
        if (machineName.isBlank() || equipmentType.isBlank() || maintenanceDate == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Machine, equipment type and maintenance date are required"));
        }
        MaintenanceSchedule row = new MaintenanceSchedule();
        row.setMachineName(machineName);
        row.setEquipmentType(equipmentType.toUpperCase());
        row.setMaintenanceCategory(str(payload.get("maintenanceCategory")));
        row.setTaskDescription(str(payload.get("taskDescription")));
        row.setMaintenanceDate(maintenanceDate);
        row.setReminderDaysBefore(Math.max(0, asInt(payload.get("reminderDaysBefore"), 2)));
        row.setStatus("SCHEDULED");
        row.setNote(str(payload.get("note")));
        row.setCreatedAt(LocalDateTime.now());
        MaintenanceSchedule saved = scheduleRepository.save(row);
        return ResponseEntity.ok(Map.of("message", "Maintenance schedule created", "id", saved.getId()));
    }

    @PutMapping("/schedules/{id}")
    public ResponseEntity<?> updateSchedule(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            MaintenanceSchedule row = scheduleRepository.findById(id).orElseThrow(() -> new RuntimeException("Schedule not found"));
            if (payload.containsKey("machineName")) {
                String v = str(payload.get("machineName"));
                if (v.isBlank()) return ResponseEntity.badRequest().body(Map.of("message", "Machine name cannot be blank"));
                row.setMachineName(v);
            }
            if (payload.containsKey("equipmentType")) {
                String v = str(payload.get("equipmentType"));
                if (v.isBlank()) return ResponseEntity.badRequest().body(Map.of("message", "Equipment type cannot be blank"));
                row.setEquipmentType(v.toUpperCase());
            }
            if (payload.containsKey("maintenanceCategory")) row.setMaintenanceCategory(str(payload.get("maintenanceCategory")));
            if (payload.containsKey("taskDescription")) row.setTaskDescription(str(payload.get("taskDescription")));
            if (payload.containsKey("maintenanceDate")) {
                LocalDate d = parseDate(payload.get("maintenanceDate"));
                if (d == null) return ResponseEntity.badRequest().body(Map.of("message", "Invalid maintenance date"));
                row.setMaintenanceDate(d);
            }
            if (payload.containsKey("reminderDaysBefore")) row.setReminderDaysBefore(Math.max(0, asInt(payload.get("reminderDaysBefore"), row.getReminderDaysBefore())));
            if (payload.containsKey("note")) row.setNote(str(payload.get("note")));
            if (payload.containsKey("status")) {
                String st = upperOrDefault(str(payload.get("status")), row.getStatus());
                row.setStatus(st);
                if (isCompleted(st) && row.getCompletedAt() == null) row.setCompletedAt(LocalDateTime.now());
            }
            scheduleRepository.save(row);
            return ResponseEntity.ok(Map.of("message", "Maintenance schedule updated"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/schedules/{id}/complete")
    public ResponseEntity<?> completeSchedule(@PathVariable Long id) {
        try {
            MaintenanceSchedule row = scheduleRepository.findById(id).orElseThrow(() -> new RuntimeException("Schedule not found"));
            row.setStatus("COMPLETED");
            if (row.getCompletedAt() == null) row.setCompletedAt(LocalDateTime.now());
            scheduleRepository.save(row);
            return ResponseEntity.ok(Map.of("message", "Schedule marked as completed"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/reminders")
    public List<Map<String, Object>> reminders(@RequestParam(defaultValue = "7") int withinDays) {
        return reminderRows(withinDays);
    }

    @GetMapping("/breakdowns")
    public List<Map<String, Object>> breakdowns() {
        return breakdownRepository.findAllByOrderByBreakdownTimeDesc().stream().map(this::breakdownView).collect(Collectors.toList());
    }

    @PostMapping("/breakdowns")
    public ResponseEntity<?> createBreakdown(@RequestBody Map<String, Object> payload) {
        String machineName = str(payload.get("machineName"));
        String equipmentType = str(payload.get("equipmentType"));
        String details = str(payload.get("breakdownDetails"));
        if (machineName.isBlank() || equipmentType.isBlank() || details.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Machine, equipment type and breakdown details are required"));
        }
        EquipmentBreakdown row = new EquipmentBreakdown();
        row.setMachineName(machineName);
        row.setEquipmentType(equipmentType.toUpperCase());
        row.setBreakdownDetails(details);
        row.setAssignedTechnician(str(payload.get("assignedTechnician")));
        row.setBreakdownTime(parseDateTime(payload.get("breakdownTime")));
        if (row.getBreakdownTime() == null) row.setBreakdownTime(LocalDateTime.now());
        row.setStatus(upperOrDefault(str(payload.get("status")), "REPORTED"));
        row.setMaintenanceCost(Math.max(0d, asDouble(payload.get("maintenanceCost"), 0d)));
        row.setRepairHours(Math.max(0d, asDouble(payload.get("repairHours"), 0d)));
        row.setDowntimeHours(Math.max(0d, asDouble(payload.get("downtimeHours"), 0d)));
        row.setRepairCompletedAt(parseDateTime(payload.get("repairCompletedAt")));
        row.setNote(str(payload.get("note")));
        row.setCreatedAt(LocalDateTime.now());
        row.setUpdatedAt(LocalDateTime.now());
        if (isResolved(row.getStatus()) && row.getRepairCompletedAt() == null) row.setRepairCompletedAt(LocalDateTime.now());
        hydrateBreakdownDurations(row);
        EquipmentBreakdown saved = breakdownRepository.save(row);
        return ResponseEntity.ok(Map.of("message", "Breakdown recorded", "id", saved.getId()));
    }

    @PutMapping("/breakdowns/{id}")
    public ResponseEntity<?> updateBreakdown(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            EquipmentBreakdown row = breakdownRepository.findById(id).orElseThrow(() -> new RuntimeException("Breakdown not found"));
            if (payload.containsKey("machineName")) {
                String v = str(payload.get("machineName"));
                if (v.isBlank()) return ResponseEntity.badRequest().body(Map.of("message", "Machine name cannot be blank"));
                row.setMachineName(v);
            }
            if (payload.containsKey("equipmentType")) {
                String v = str(payload.get("equipmentType"));
                if (v.isBlank()) return ResponseEntity.badRequest().body(Map.of("message", "Equipment type cannot be blank"));
                row.setEquipmentType(v.toUpperCase());
            }
            if (payload.containsKey("breakdownDetails")) {
                String v = str(payload.get("breakdownDetails"));
                if (v.isBlank()) return ResponseEntity.badRequest().body(Map.of("message", "Breakdown details cannot be blank"));
                row.setBreakdownDetails(v);
            }
            if (payload.containsKey("assignedTechnician")) row.setAssignedTechnician(str(payload.get("assignedTechnician")));
            if (payload.containsKey("status")) row.setStatus(upperOrDefault(str(payload.get("status")), row.getStatus()));
            if (payload.containsKey("breakdownTime")) {
                LocalDateTime dt = parseDateTime(payload.get("breakdownTime"));
                if (dt == null) return ResponseEntity.badRequest().body(Map.of("message", "Invalid breakdown time"));
                row.setBreakdownTime(dt);
            }
            if (payload.containsKey("repairCompletedAt")) row.setRepairCompletedAt(parseDateTime(payload.get("repairCompletedAt")));
            if (payload.containsKey("maintenanceCost")) row.setMaintenanceCost(Math.max(0d, asDouble(payload.get("maintenanceCost"), row.getMaintenanceCost())));
            if (payload.containsKey("repairHours")) row.setRepairHours(Math.max(0d, asDouble(payload.get("repairHours"), row.getRepairHours())));
            if (payload.containsKey("downtimeHours")) row.setDowntimeHours(Math.max(0d, asDouble(payload.get("downtimeHours"), row.getDowntimeHours())));
            if (payload.containsKey("note")) row.setNote(str(payload.get("note")));
            if (isResolved(row.getStatus()) && row.getRepairCompletedAt() == null) row.setRepairCompletedAt(LocalDateTime.now());
            row.setUpdatedAt(LocalDateTime.now());
            hydrateBreakdownDurations(row);
            breakdownRepository.save(row);
            return ResponseEntity.ok(Map.of("message", "Breakdown updated"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/spare-parts")
    public List<Map<String, Object>> spareParts() {
        return sparePartRepository.findAllByOrderByPartNameAsc().stream().map(this::sparePartView).collect(Collectors.toList());
    }

    @PostMapping("/spare-parts")
    public ResponseEntity<?> createSparePart(@RequestBody Map<String, Object> payload) {
        String partName = str(payload.get("partName"));
        if (partName.isBlank()) return ResponseEntity.badRequest().body(Map.of("message", "Part name is required"));
        if (sparePartRepository.findByPartNameIgnoreCase(partName).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Part already exists"));
        }
        SparePart row = new SparePart();
        row.setPartName(partName);
        row.setPartNumber(str(payload.get("partNumber")));
        row.setQuantityInStock(Math.max(0d, asDouble(payload.get("quantityInStock"), 0d)));
        row.setUnit(defaultIfBlank(str(payload.get("unit")), "pcs"));
        row.setMinimumStockLevel(Math.max(0d, asDouble(payload.get("minimumStockLevel"), 1d)));
        row.setUnitCost(Math.max(0d, asDouble(payload.get("unitCost"), 0d)));
        row.setUpdatedAt(LocalDateTime.now());
        SparePart saved = sparePartRepository.save(row);
        return ResponseEntity.ok(Map.of("message", "Spare part added", "id", saved.getId()));
    }

    @PutMapping("/spare-parts/{id}")
    public ResponseEntity<?> updateSparePart(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            SparePart row = sparePartRepository.findById(id).orElseThrow(() -> new RuntimeException("Spare part not found"));
            if (payload.containsKey("partName")) {
                String next = str(payload.get("partName"));
                if (next.isBlank()) return ResponseEntity.badRequest().body(Map.of("message", "Part name cannot be blank"));
                Optional<SparePart> dup = sparePartRepository.findByPartNameIgnoreCase(next);
                if (dup.isPresent() && !dup.get().getId().equals(id)) return ResponseEntity.badRequest().body(Map.of("message", "Part already exists"));
                row.setPartName(next);
            }
            if (payload.containsKey("partNumber")) row.setPartNumber(str(payload.get("partNumber")));
            if (payload.containsKey("quantityInStock")) row.setQuantityInStock(Math.max(0d, asDouble(payload.get("quantityInStock"), row.getQuantityInStock())));
            if (payload.containsKey("unit")) row.setUnit(defaultIfBlank(str(payload.get("unit")), defaultIfBlank(row.getUnit(), "pcs")));
            if (payload.containsKey("minimumStockLevel")) row.setMinimumStockLevel(Math.max(0d, asDouble(payload.get("minimumStockLevel"), row.getMinimumStockLevel())));
            if (payload.containsKey("unitCost")) row.setUnitCost(Math.max(0d, asDouble(payload.get("unitCost"), row.getUnitCost())));
            row.setUpdatedAt(LocalDateTime.now());
            sparePartRepository.save(row);
            return ResponseEntity.ok(Map.of("message", "Spare part updated"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/spare-parts/{id}/consume")
    public ResponseEntity<?> consumeSparePart(@PathVariable Long id, @RequestBody Map<String, Object> payload) {
        try {
            SparePart part = sparePartRepository.findById(id).orElseThrow(() -> new RuntimeException("Spare part not found"));
            double qty = asDouble(payload.get("quantityUsed"), 0d);
            if (qty <= 0) return ResponseEntity.badRequest().body(Map.of("message", "Usage quantity must be greater than 0"));
            if (part.getQuantityInStock() < qty) return ResponseEntity.badRequest().body(Map.of("message", "Insufficient spare part stock"));

            EquipmentBreakdown breakdown = null;
            if (payload.containsKey("breakdownId")) {
                long bid = asLong(payload.get("breakdownId"), 0L);
                if (bid > 0) breakdown = breakdownRepository.findById(bid).orElseThrow(() -> new RuntimeException("Breakdown not found"));
            }

            part.setQuantityInStock(part.getQuantityInStock() - qty);
            part.setUpdatedAt(LocalDateTime.now());
            sparePartRepository.save(part);

            SparePartUsage usage = new SparePartUsage();
            usage.setSparePart(part);
            usage.setBreakdown(breakdown);
            usage.setQuantityUsed(qty);
            usage.setTotalCost(round2(qty * part.getUnitCost()));
            usage.setNote(str(payload.get("note")));
            usage.setUsedAt(LocalDateTime.now());
            sparePartUsageRepository.save(usage);

            return ResponseEntity.ok(Map.of("message", "Spare part usage recorded", "currentStock", part.getQuantityInStock()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/spare-parts/alerts")
    public List<Map<String, Object>> sparePartAlerts() {
        return sparePartRepository.findAllByOrderByPartNameAsc().stream()
                .filter(p -> p.getQuantityInStock() <= p.getMinimumStockLevel())
                .map(this::sparePartView).collect(Collectors.toList());
    }

    @GetMapping("/spare-parts/usages")
    public List<Map<String, Object>> sparePartUsages(@RequestParam(required = false) Long sparePartId) {
        List<SparePartUsage> rows = sparePartId == null
                ? sparePartUsageRepository.findAllByOrderByUsedAtDesc()
                : sparePartUsageRepository.findBySparePart_IdOrderByUsedAtDesc(sparePartId);
        return rows.stream().map(this::usageView).collect(Collectors.toList());
    }

    @GetMapping("/performance")
    public Map<String, Object> performance(@RequestParam(defaultValue = "30") int days) {
        int d = Math.max(1, days);
        LocalDateTime from = LocalDateTime.now().minusDays(d);
        List<EquipmentBreakdown> rows = breakdownRepository.findByBreakdownTimeBetween(from, LocalDateTime.now());
        Map<String, List<EquipmentBreakdown>> grouped = rows.stream()
                .collect(Collectors.groupingBy(r -> defaultIfBlank(r.getMachineName(), "Unknown Machine")));

        List<Map<String, Object>> outRows = new ArrayList<>();
        for (Map.Entry<String, List<EquipmentBreakdown>> e : grouped.entrySet()) {
            List<EquipmentBreakdown> list = e.getValue();
            long resolvedCount = list.stream().filter(r -> isResolved(r.getStatus())).count();
            double totalDowntime = round2(list.stream().mapToDouble(this::effectiveDowntimeHours).sum());
            double totalCost = round2(list.stream().mapToDouble(r -> Math.max(0d, r.getMaintenanceCost())).sum());
            double avgRepair = round2(list.stream().mapToDouble(this::effectiveRepairHours).filter(v -> v > 0).average().orElse(0d));
            LocalDateTime lastAt = list.stream().map(EquipmentBreakdown::getBreakdownTime).filter(Objects::nonNull).max(LocalDateTime::compareTo).orElse(null);
            String equipmentType = list.stream().map(EquipmentBreakdown::getEquipmentType).filter(v -> v != null && !v.isBlank()).findFirst().orElse("");

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("machineName", e.getKey());
            row.put("equipmentType", equipmentType);
            row.put("breakdownCount", list.size());
            row.put("resolvedCount", resolvedCount);
            row.put("totalDowntimeHours", totalDowntime);
            row.put("totalMaintenanceCost", totalCost);
            row.put("averageRepairHours", avgRepair);
            row.put("lastBreakdownAt", lastAt);
            outRows.add(row);
        }

        outRows.sort((a, b) -> Integer.compare(((Number) b.get("breakdownCount")).intValue(), ((Number) a.get("breakdownCount")).intValue()));
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalMachines", outRows.size());
        summary.put("totalBreakdowns", rows.size());
        summary.put("totalDowntimeHours", round2(rows.stream().mapToDouble(this::effectiveDowntimeHours).sum()));
        summary.put("totalMaintenanceCost", round2(rows.stream().mapToDouble(r -> Math.max(0d, r.getMaintenanceCost())).sum()));
        return Map.of("days", d, "summary", summary, "rows", outRows);
    }

    private List<Map<String, Object>> reminderRows(int withinDays) {
        int days = Math.max(1, withinDays);
        LocalDate today = LocalDate.now();
        List<MaintenanceSchedule> rows = scheduleRepository.findByStatusIgnoreCaseAndMaintenanceDateBetweenOrderByMaintenanceDateAsc(
                "SCHEDULED", today, today.plusDays(days)
        );
        return rows.stream().filter(s -> {
            if (s.getMaintenanceDate() == null) return false;
            long left = ChronoUnit.DAYS.between(today, s.getMaintenanceDate());
            return left >= 0 && left <= Math.max(0, s.getReminderDaysBefore());
        }).map(this::scheduleView).collect(Collectors.toList());
    }

    private Map<String, Object> scheduleView(MaintenanceSchedule s) {
        LocalDate today = LocalDate.now();
        String status = upperOrDefault(s.getStatus(), "SCHEDULED");
        if (!isCompleted(status) && s.getMaintenanceDate() != null && s.getMaintenanceDate().isBefore(today)) status = "OVERDUE";
        long daysLeft = s.getMaintenanceDate() == null ? 0 : ChronoUnit.DAYS.between(today, s.getMaintenanceDate());
        boolean reminderDue = !isCompleted(status) && s.getMaintenanceDate() != null && daysLeft >= 0 && daysLeft <= Math.max(0, s.getReminderDaysBefore());

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("equipmentType", defaultIfBlank(s.getEquipmentType(), "-"));
        m.put("machineName", defaultIfBlank(s.getMachineName(), "-"));
        m.put("maintenanceCategory", defaultIfBlank(s.getMaintenanceCategory(), ""));
        m.put("taskDescription", defaultIfBlank(s.getTaskDescription(), ""));
        m.put("maintenanceDate", s.getMaintenanceDate());
        m.put("reminderDaysBefore", s.getReminderDaysBefore());
        m.put("daysUntilMaintenance", daysLeft);
        m.put("reminderDue", reminderDue);
        m.put("status", status);
        m.put("note", defaultIfBlank(s.getNote(), ""));
        m.put("createdAt", s.getCreatedAt());
        m.put("completedAt", s.getCompletedAt());
        return m;
    }

    private Map<String, Object> breakdownView(EquipmentBreakdown b) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", b.getId());
        m.put("equipmentType", defaultIfBlank(b.getEquipmentType(), "-"));
        m.put("machineName", defaultIfBlank(b.getMachineName(), "-"));
        m.put("breakdownTime", b.getBreakdownTime());
        m.put("breakdownDetails", defaultIfBlank(b.getBreakdownDetails(), ""));
        m.put("assignedTechnician", defaultIfBlank(b.getAssignedTechnician(), ""));
        m.put("status", upperOrDefault(b.getStatus(), "REPORTED"));
        m.put("repairCompletedAt", b.getRepairCompletedAt());
        m.put("repairHours", effectiveRepairHours(b));
        m.put("maintenanceCost", round2(Math.max(0d, b.getMaintenanceCost())));
        m.put("downtimeHours", effectiveDowntimeHours(b));
        m.put("note", defaultIfBlank(b.getNote(), ""));
        m.put("createdAt", b.getCreatedAt());
        m.put("updatedAt", b.getUpdatedAt());
        return m;
    }

    private Map<String, Object> sparePartView(SparePart p) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", p.getId());
        m.put("partName", p.getPartName());
        m.put("partNumber", defaultIfBlank(p.getPartNumber(), ""));
        m.put("quantityInStock", p.getQuantityInStock());
        m.put("unit", defaultIfBlank(p.getUnit(), "pcs"));
        m.put("minimumStockLevel", p.getMinimumStockLevel());
        m.put("unitCost", p.getUnitCost());
        m.put("lowStock", p.getQuantityInStock() <= p.getMinimumStockLevel());
        m.put("updatedAt", p.getUpdatedAt());
        return m;
    }

    private Map<String, Object> usageView(SparePartUsage u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.getId());
        m.put("sparePartId", u.getSparePart() != null ? u.getSparePart().getId() : null);
        m.put("partName", u.getSparePart() != null ? u.getSparePart().getPartName() : "-");
        m.put("quantityUsed", u.getQuantityUsed());
        m.put("totalCost", u.getTotalCost());
        m.put("usedAt", u.getUsedAt());
        m.put("note", defaultIfBlank(u.getNote(), ""));
        m.put("breakdownId", u.getBreakdown() != null ? u.getBreakdown().getId() : null);
        m.put("machineName", u.getBreakdown() != null ? defaultIfBlank(u.getBreakdown().getMachineName(), "-") : "-");
        return m;
    }

    private void hydrateBreakdownDurations(EquipmentBreakdown b) {
        if (b.getBreakdownTime() == null || b.getRepairCompletedAt() == null) return;
        double computed = betweenHours(b.getBreakdownTime(), b.getRepairCompletedAt());
        if (b.getRepairHours() <= 0) b.setRepairHours(computed);
        if (b.getDowntimeHours() <= 0) b.setDowntimeHours(computed);
    }

    private double effectiveRepairHours(EquipmentBreakdown b) {
        if (b.getRepairHours() > 0) return round2(b.getRepairHours());
        return betweenHours(b.getBreakdownTime(), b.getRepairCompletedAt());
    }

    private double effectiveDowntimeHours(EquipmentBreakdown b) {
        if (b.getDowntimeHours() > 0) return round2(b.getDowntimeHours());
        return betweenHours(b.getBreakdownTime(), b.getRepairCompletedAt());
    }

    private double betweenHours(LocalDateTime from, LocalDateTime to) {
        if (from == null || to == null || to.isBefore(from)) return 0d;
        return round2(ChronoUnit.MINUTES.between(from, to) / 60d);
    }

    private boolean isCompleted(String status) {
        return "COMPLETED".equalsIgnoreCase(upperOrDefault(status, ""));
    }

    private boolean isResolved(String status) {
        return "RESOLVED".equalsIgnoreCase(upperOrDefault(status, ""));
    }

    private String str(Object value) {
        if (value == null) return "";
        String text = String.valueOf(value).trim();
        return "null".equalsIgnoreCase(text) ? "" : text;
    }

    private String defaultIfBlank(String value, String fallback) {
        return (value == null || value.isBlank()) ? fallback : value;
    }

    private String upperOrDefault(String value, String fallback) {
        String v = defaultIfBlank(value == null ? null : value.trim(), fallback);
        return v.toUpperCase();
    }

    private int asInt(Object value, int fallback) {
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (Exception e) {
            return fallback;
        }
    }

    private long asLong(Object value, long fallback) {
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (Exception e) {
            return fallback;
        }
    }

    private double asDouble(Object value, double fallback) {
        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (Exception e) {
            return fallback;
        }
    }

    private LocalDate parseDate(Object value) {
        String text = str(value);
        if (text.isBlank()) return null;
        try {
            return LocalDate.parse(text);
        } catch (Exception e) {
            try {
                return LocalDateTime.parse(text).toLocalDate();
            } catch (Exception ignore) {
                return null;
            }
        }
    }

    private LocalDateTime parseDateTime(Object value) {
        String text = str(value);
        if (text.isBlank()) return null;
        try {
            return LocalDateTime.parse(text);
        } catch (Exception e) {
            try {
                return LocalDate.parse(text).atStartOfDay();
            } catch (Exception ignore) {
                return null;
            }
        }
    }

    private double round2(double value) {
        return Math.round(value * 100d) / 100d;
    }
}
