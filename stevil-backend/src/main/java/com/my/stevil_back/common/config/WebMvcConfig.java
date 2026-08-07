package com.my.stevil_back.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String os = System.getProperty("os.name").toLowerCase();
        String resourceLocation;

        if (os.contains("win")) {
            resourceLocation = "file:///C:/uploads/";
        } else {
            resourceLocation = "file:/home/ubuntu/uploads/";
        }

        registry.addResourceHandler("/api/uploads/**")
                .addResourceLocations(resourceLocation);
    }
}