package com.demo.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.demo.entity.ContactMessage;
import com.demo.service.ContactService;

@RestController
@RequestMapping("/api/contact")
@CrossOrigin("*")
public class ContactController {

    @Autowired
    private ContactService contactService;

    @PostMapping
    public ResponseEntity<?> sendMessage(@RequestBody ContactMessage message) {
        contactService.saveMessage(message);
        return ResponseEntity.ok("Message saved successfully");
    }
}