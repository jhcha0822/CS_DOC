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
 * admin_grading_notification 테이블 생성 (관리자용 평가 필요 알림). H2 전용.
 */
@Component
@Profile("test")
@Order(5)
public class AdminGradingNotificationSchemaMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminGradingNotificationSchemaMigration.class);

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        try {
            String checkSql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = 'ADMIN_GRADING_NOTIFICATION'";
            Long count = ((Number) entityManager.createNativeQuery(checkSql).getSingleResult()).longValue();
            if (count == 0) {
                entityManager.createNativeQuery(
                        "CREATE TABLE admin_grading_notification (" +
                                "id BIGINT AUTO_INCREMENT PRIMARY KEY," +
                                "admin_id BIGINT NOT NULL," +
                                "post_id BIGINT NOT NULL," +
                                "read_at TIMESTAMP NULL," +
                                "created_at TIMESTAMP NOT NULL," +
                                "CONSTRAINT uk_admin_grading_notification_admin_post UNIQUE (admin_id, post_id))"
                ).executeUpdate();
                entityManager.createNativeQuery("CREATE INDEX idx_admin_grading_notification_admin_id ON admin_grading_notification(admin_id)").executeUpdate();
                entityManager.createNativeQuery("CREATE INDEX idx_admin_grading_notification_read_at ON admin_grading_notification(read_at)").executeUpdate();
                log.info("admin_grading_notification 테이블 생성 완료");
            }
        } catch (Exception e) {
            log.warn("admin_grading_notification 테이블 마이그레이션 실패: {}", e.getMessage());
        }
    }
}
