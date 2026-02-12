package com.fasoo.cs_doc.global.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * API 요청에 대한 인증 체크 인터셉터.
 * X-User-Id 헤더가 없으면 401 Unauthorized 반환.
 */
@Component
public class AuthInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // 로그인 페이지와 정적 리소스는 제외
        String path = request.getRequestURI();
        if (path.startsWith("/login") || 
            path.startsWith("/h2-console") || 
            path.startsWith("/swagger") || 
            path.startsWith("/v3/api-docs") ||
            path.startsWith("/error")) {
            return true;
        }

        // API 요청에 대해서만 인증 체크 (로그인 관련 API는 제외)
        if (path.startsWith("/api/")) {
            // 로그인 페이지에서 사용하는 사용자 목록 조회는 인증 불필요
            if (path.equals("/api/users") && "GET".equals(request.getMethod())) {
                return true;
            }
            
            String userId = request.getHeader("X-User-Id");
            if (userId == null || userId.trim().isEmpty()) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write("{\"code\":\"UNAUTHORIZED\",\"message\":\"인증이 필요합니다.\"}");
                return false;
            }
        }

        return true;
    }
}
