package com.demo.service;

import com.demo.entity.Order;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;

@Service
public class PayLaterEmailService {

    @Autowired
    private JavaMailSender mailSender;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd-MM-yyyy");

    public void sendPayLaterReminder(Order order, boolean isDueDateReached) {
        if (order == null || order.getUser() == null) {
            return;
        }

        String email = order.getUser().getEmail();
        if (email == null || email.isBlank()) {
            return;
        }

        String orderId = order.getOrderId() == null ? "-" : order.getOrderId();
        String customerName = order.getUser().getName() == null ? "Customer" : order.getUser().getName();
        String dueDateStr = order.getCreditDueDate() == null
                ? "N/A"
                : order.getCreditDueDate().format(DATE_FMT);
        double amount = order.getTotalPrice();

        String subject;
        String body;

        if (isDueDateReached) {
            subject = "⚠️ Payment Due Today – Order " + orderId + " | RRY Infra";
            body = "Dear " + customerName + ",\n\n"
                    + "Your payment for Order ID: " + orderId + " is due TODAY.\n"
                    + "Amount Payable: Rs. " + String.format("%.2f", amount) + "\n"
                    + "Due Date: " + dueDateStr + "\n\n"
                    + "Please log in to the RRY Infra portal and click 'Pay Now' to complete your payment immediately.\n\n"
                    + "Failure to pay may result in order cancellation.\n\n"
                    + "Regards,\nRRY Infra Private Limited\n"
                    + "Email: RRYinfra@gmail.com";
        } else {
            subject = "Reminder: Pending Payment – Order " + orderId + " | RRY Infra";
            body = "Dear " + customerName + ",\n\n"
                    + "This is a friendly reminder that payment for your order is pending.\n\n"
                    + "Order ID   : " + orderId + "\n"
                    + "Amount     : Rs. " + String.format("%.2f", amount) + "\n"
                    + "Due Date   : " + dueDateStr + "\n\n"
                    + "Please log in to the RRY Infra portal to complete your payment before the due date.\n\n"
                    + "Regards,\nRRY Infra Private Limited\n"
                    + "Email: RRYinfra@gmail.com";
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(email);
            message.setSubject(subject);
            message.setText(body);
            message.setFrom("rryaisolutions5@gmail.com");
            mailSender.send(message);
        } catch (MailException ex) {
            // Log but do not rethrow – email failure must not block in-app notifications
            System.err.println("[PayLaterEmailService] Failed to send email to " + email + ": " + ex.getMessage());
        }
    }
}
