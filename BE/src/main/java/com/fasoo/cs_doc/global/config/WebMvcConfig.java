package com.fasoo.cs_doc.global.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Autowired
    private AuthInterceptor authInterceptor;

    @Autowired
    private StorageProperties storageProperties;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:5173", "http://192.168.11.181:5173")
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authInterceptor)
                .addPathPatterns("/**")
                .excludePathPatterns("/login", "/api/auth/**", "/api/users", "/h2-console/**", "/swagger/**", "/v3/api-docs/**", "/error", "/uploads/**");
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // /uploads/** 경로를 실제 업로드 디렉토리로 매핑
        String uploadDir = storageProperties.uploadDir();
        if (uploadDir == null || uploadDir.isBlank()) {
            String mdRoot = storageProperties.mdRoot();
            if (mdRoot != null && !mdRoot.isBlank()) {
                uploadDir = Paths.get(mdRoot).getParent().resolve("uploads").toString();
            }
        }
        
        if (uploadDir != null && !uploadDir.isBlank()) {
            try {
                // Windows 경로 호환: 슬래시 통일
                String normalizedDir = uploadDir.replace('\\', '/').trim();
                Path uploadPath = Paths.get(normalizedDir).toAbsolutePath().normalize();
                
                // 절대 경로를 file:// URL 형식으로 변환
                String pathStr = uploadPath.toString().replace('\\', '/');
                // Windows 드라이브 경로 처리 (C:/ -> /C:/)
                if (pathStr.length() > 1 && pathStr.charAt(1) == ':') {
                    pathStr = "/" + pathStr;
                }
                // file:// URL 형식으로 변환
                String fileUrl = "file://" + pathStr;
                
                registry.addResourceHandler("/uploads/**")
                        .addResourceLocations(fileUrl + "/")
                        .setCachePeriod(3600); // 1시간 캐시
            } catch (Exception e) {
                // 설정 실패 시 로그만 남기고 계속 진행
                System.err.println("Failed to configure upload resource handler: " + e.getMessage());
                e.printStackTrace();
            }
        }
    }
}
