package com.demo.service;

import com.demo.entity.ConcreteProductStock;
import com.demo.entity.MixDesignCostLine;
import com.demo.entity.MixDesignCostSheet;
import com.demo.entity.Order;
import com.demo.entity.RawMaterial;
import com.demo.repository.ConcreteProductStockRepository;
import com.demo.repository.MixDesignCostSheetRepository;
import com.demo.repository.OrderRepository;
import com.demo.repository.RawMaterialRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
public class AdminFinanceProductPricingService {

    @Autowired
    private ConcreteProductStockRepository concreteProductStockRepository;

    @Autowired
    private RawMaterialRepository rawMaterialRepository;

    @Autowired
    private MixDesignCostSheetRepository mixDesignCostSheetRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private MixDesignCostService mixDesignCostService;

    public List<Map<String, Object>> getProductOptions() {
        mixDesignCostService.ensureSeedData();

        Set<String> names = new LinkedHashSet<>();
        for (RawMaterial rawMaterial : rawMaterialRepository.findAll()) {
            if (rawMaterial.getName() != null && !rawMaterial.getName().isBlank()) {
                names.add(rawMaterial.getName().trim());
            }
        }
        for (ConcreteProductStock product : concreteProductStockRepository.findAll()) {
            if (product.getName() != null && !product.getName().isBlank()) {
                names.add(product.getName().trim());
            }
        }
        for (Order order : orderRepository.findAll()) {
            if (order.getGrade() != null && !order.getGrade().isBlank()) {
                names.add(order.getGrade().trim());
            }
        }
        for (MixDesignCostSheet sheet : mixDesignCostSheetRepository.findAll()) {
            if (sheet.getGradeLabel() != null && !sheet.getGradeLabel().isBlank()) {
                names.add(sheet.getGradeLabel().trim());
            }
            for (MixDesignCostLine line : sheet.getLines()) {
                if (line.getIngredientName() != null && !line.getIngredientName().isBlank()) {
                    names.add(line.getIngredientName().trim());
                }
            }
        }

        List<String> sorted = names.stream()
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .toList();

        List<Map<String, Object>> options = new ArrayList<>();
        for (String name : sorted) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("name", name);
            options.add(row);
        }
        return options;
    }

    public Map<String, Object> getProductPricingDetails(String productName) {
        mixDesignCostService.ensureSeedData();

        String requestedName = safe(productName);
        if (requestedName.isBlank()) {
            throw new IllegalArgumentException("productName is required");
        }

        Optional<RawMaterial> rawMaterialOpt = rawMaterialRepository.findByNameIgnoreCase(requestedName);
        Optional<ConcreteProductStock> concreteProductOpt = concreteProductStockRepository.findByNameIgnoreCase(requestedName);

        MixDesignCostSheet gradeSheet = findGradeSheet(requestedName).orElse(null);
        List<MixDesignCostSheet> allSheets = mixDesignCostSheetRepository.findAll().stream()
                .sorted(Comparator.comparing(MixDesignCostSheet::getGradeCode))
                .toList();

        List<String> aliases = ingredientAliases(requestedName);
        List<Map<String, Object>> gradeRows = new ArrayList<>();

        if (gradeSheet != null) {
            gradeRows.add(Map.of(
                    "grade", gradeSheet.getGradeCode(),
                    "gradeLabel", gradeSheet.getGradeLabel(),
                    "rate", round(gradeSheet.getTotalCostPerM3()),
                    "quantityPerM3", round(1),
                    "costPerM3", round(gradeSheet.getTotalCostPerM3()),
                    "totalSheetCostPerM3", round(gradeSheet.getTotalCostPerM3()),
                    "totalDensity", round(gradeSheet.getTotalDensity())
            ));
        } else {
            for (MixDesignCostSheet sheet : allSheets) {
                for (MixDesignCostLine line : sheet.getLines()) {
                    if (!matchesAlias(line.getIngredientName(), aliases)) {
                        continue;
                    }
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("grade", sheet.getGradeCode());
                    row.put("gradeLabel", sheet.getGradeLabel());
                    row.put("rate", round(line.getRate()));
                    row.put("quantityPerM3", round(line.getQuantityPerM3()));
                    row.put("costPerM3", round(line.getCostPerM3()));
                    row.put("totalSheetCostPerM3", round(sheet.getTotalCostPerM3()));
                    row.put("totalDensity", round(sheet.getTotalDensity()));
                    gradeRows.add(row);
                }
            }
        }

        if (gradeRows.isEmpty() && rawMaterialOpt.isEmpty() && concreteProductOpt.isEmpty()) {
            throw new IllegalArgumentException("Pricing data is not available for the selected product");
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("productName", requestedName);
        response.put("gradeRows", gradeRows);
        return response;
    }

    private Optional<MixDesignCostSheet> findGradeSheet(String productName) {
        String normalized = normalize(productName);
        return mixDesignCostSheetRepository.findAll().stream()
                .filter(sheet -> normalize(sheet.getGradeCode()).equals(normalized)
                        || normalize(sheet.getGradeLabel()).equals(normalized))
                .findFirst();
    }

    private boolean matchesAlias(String ingredientName, List<String> aliases) {
        String normalized = normalize(ingredientName);
        return aliases.stream().anyMatch(normalized::equals);
    }

    private List<String> ingredientAliases(String productName) {
        String normalized = normalize(productName);
        if (normalized.equals("CEMENT") || normalized.equals("OPCCEMENT")) {
            return List.of("OPCCEMENT", "CEMENT");
        }
        if (normalized.equals("SAND") || normalized.equals("WASHSAND") || normalized.equals("CRUSHERSAND")) {
            return List.of("SAND", "WASHSAND", "CRUSHERSAND");
        }
        if (normalized.equals("AGGREGATES") || normalized.equals("20MM") || normalized.equals("10MM")) {
            return List.of("AGGREGATES", "20MM", "10MM");
        }
        if (normalized.equals("ADMIXTURES") || normalized.equals("ADMIXTURE")) {
            return List.of("ADMIXTURES", "ADMIXTURE");
        }
        return List.of(normalized);
    }

    private String normalize(String value) {
        return safe(value).toUpperCase(Locale.ROOT).replace(" ", "").replace("-", "");
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

}
