package com.fasoo.cs_doc.global.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final StorageProperties storageProperties;

    public WebMvcConfig(StorageProperties storageProperties) {
        this.storageProperties = storageProperties;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String uploadDir = storageProperties.uploadDir();
        if (uploadDir == null || uploadDir.isBlank()) {
            uploadDir = Paths.get(storageProperties.mdRoot()).getParent().resolve("uploads").toString();
        }
        Path path = Paths.get(uploadDir).toAbsolutePath().normalize();
        String location = path.toUri().toString();
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(location.endsWith("/") ? location : location + "/");
    }
}
