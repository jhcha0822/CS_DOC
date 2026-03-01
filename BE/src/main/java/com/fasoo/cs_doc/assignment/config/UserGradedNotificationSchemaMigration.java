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
 * user_graded_notification 테이블 생성 (사용자용 평가 완료 알림). H2 전용.
 */
@Component
@Profile("test")
@Order(6)
public class UserGradedNotificationSchemaMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(UserGradedNotificationSchemaMigration.class);

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        try {
            String checkSql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = 'USER_GRADED_NOTIFICATION'";
            Long count = ((Number) entityManager.createNativeQuery(checkSql).getSingleResult()).longValue();
            if (count == 0) {
                entityManager.createNativeQuery(
                        "CREATE TABLE user_graded_notification (" +
                                "id BIGINT AUTO_INCREMENT PRIMARY KEY," +
                                "user_id BIGINT NOT NULL," +
                                "post_id BIGINT NOT NULL," +
                                "read_at TIMESTAMP NULL," +
                                "created_at TIMESTAMP NOT NULL," +
                                "CONSTRAINT uk_user_graded_notification_user_post UNIQUE (user_id, post_id))"
                ).executeUpdate();
                entityManager.createNativeQuery("CREATE INDEX idx_user_graded_notification_user_id ON user_graded_notification(user_id)").executeUpdate();
                entityManager.createNativeQuery("CREATE INDEX idx_user_graded_notification_read_at ON user_graded_notification(read_at)").executeUpdate();
                log.info("user_graded_notification 테이블 생성 완료");
            }
        } catch (Exception e) {
            log.warn("user_graded_notification 테이블 마이그레이션 실패: {}", e.getMessage());
        }
    }
}
