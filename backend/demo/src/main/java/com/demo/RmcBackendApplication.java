package com.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class RmcBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(RmcBackendApplication.class, args);
	}

}
