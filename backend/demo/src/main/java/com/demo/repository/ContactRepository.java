package com.demo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.demo.entity.ContactMessage;

@Repository
public interface ContactRepository extends JpaRepository<ContactMessage, Long> {

}