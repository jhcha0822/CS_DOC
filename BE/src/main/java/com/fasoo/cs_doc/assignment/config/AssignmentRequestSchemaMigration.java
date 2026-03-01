package com.fasoo.cs_doc.assignment.config;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * assignment_request 테이블 생성 (관리자 → 사용자 실습 결과 작성 요청). H2 전용.
 */
@Component
@Profile("test")
@Order(4)
public class AssignmentRequestSchemaMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AssignmentRequestSchemaMigration.class);

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        try {
            String checkSql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = 'ASSIGNMENT_REQUEST'";
            Long count = ((Number) entityManager.createNativeQuery(checkSql).getSingleResult()).longValue();
            if (count == 0) {
                entityManager.createNativeQuery(
                        "CREATE TABLE assignment_request (" +
                                "id BIGINT AUTO_INCREMENT PRIMARY KEY," +
                                "post_id BIGINT NOT NULL," +
                                "user_id BIGINT NOT NULL," +
                                "requested_by BIGINT NOT NULL," +
                                "created_at TIMESTAMP NOT NULL," +
                                "read_at TIMESTAMP NULL)"
                ).executeUpdate();
                entityManager.createNativeQuery("CREATE INDEX idx_assignment_request_user_id ON assignment_request(user_id)").executeUpdate();
                entityManager.createNativeQuery("CREATE INDEX idx_assignment_request_read_at ON assignment_request(read_at)").executeUpdate();
                log.info("assignment_request 테이블 생성 완료");
            }
        } catch (Exception e) {
            log.warn("assignment_request 테이블 마이그레이션 실패: {}", e.getMessage());
        }
    }
}
