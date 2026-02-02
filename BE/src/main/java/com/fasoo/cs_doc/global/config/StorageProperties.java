package com.fasoo.cs_doc.global.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.storage")
public record StorageProperties(
        String mdRoot,
        String uploadDir
) {}
