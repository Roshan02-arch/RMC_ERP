package com.demo.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class OrderNotificationTypeMigration implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public OrderNotificationTypeMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        try {
            jdbcTemplate.execute(
                    "ALTER TABLE order_notifications MODIFY COLUMN type ENUM(" +
                            "'PAY_LATER_REQUESTED'," +
                            "'CREDIT_APPROVED'," +
                            "'CREDIT_REJECTED'," +
                            "'PAY_LATER_REMINDER'," +
                            "'ORDER_APPROVED'," +
                            "'IN_PRODUCTION'," +
                            "'DISPATCH_SCHEDULED'," +
                            "'VEHICLE_ASSIGNED'," +
                            "'DELIVERY_STATUS_UPDATED'," +
                            "'ORDER_DELIVERED'," +
                            "'ORDER_RETURNED'" +
                            ") NOT NULL"
            );
        } catch (Exception ignored) {
            // Keep startup resilient if table is missing in fresh environments.
        }
    }
}
