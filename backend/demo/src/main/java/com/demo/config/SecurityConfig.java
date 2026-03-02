package com.demo.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {

        http
                .csrf(csrf -> csrf.disable())   // Disable CSRF for APIs
                .cors(cors -> {})               // Enable CORS
                .authorizeHttpRequests(auth -> auth
                        .anyRequest().permitAll()   // Allow all endpoints
                )
                .httpBasic(httpBasic -> httpBasic.disable())   // ❗ Disable default basic auth
                .formLogin(form -> form.disable());            // ❗ Disable default login form

        return http.build();
    }
}