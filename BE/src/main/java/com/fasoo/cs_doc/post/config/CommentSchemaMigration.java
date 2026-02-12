package com.fasoo.cs_doc.post.config;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Comment 테이블 스키마 마이그레이션.
 * comment 테이블이 없거나 필요한 컬럼이 없으면 자동으로 생성/추가합니다.
 */
@Component
@Order(100)
public class CommentSchemaMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(CommentSchemaMigration.class);

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws Exception {
        try {
            // comment 테이블 존재 여부 확인
            boolean tableExists = checkTableExists("comment");
            if (!tableExists) {
                log.info("Creating comment table...");
                entityManager.createNativeQuery(
                    "CREATE TABLE comment (" +
                    "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                    "post_id BIGINT NOT NULL, " +
                    "content VARCHAR(5000) NOT NULL, " +
                    "created_by BIGINT, " +
                    "updated_by BIGINT, " +
                    "created_at TIMESTAMP NOT NULL, " +
                    "updated_at TIMESTAMP NOT NULL, " +
                    "FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE" +
                    ")"
                ).executeUpdate();
                log.info("Comment table created successfully.");
            } else {
                log.debug("Comment table already exists.");
            }

            // 인덱스 생성 (이미 존재하면 무시됨)
            try {
                entityManager.createNativeQuery(
                    "CREATE INDEX IF NOT EXISTS idx_comment_post_id ON comment(post_id)"
                ).executeUpdate();
            } catch (Exception e) {
                // 인덱스가 이미 존재하거나 다른 이유로 실패할 수 있음
                log.debug("Index creation skipped (may already exist): {}", e.getMessage());
            }

            try {
                entityManager.createNativeQuery(
                    "CREATE INDEX IF NOT EXISTS idx_comment_created_at ON comment(created_at)"
                ).executeUpdate();
            } catch (Exception e) {
                log.debug("Index creation skipped (may already exist): {}", e.getMessage());
            }

        } catch (Exception e) {
            log.error("Failed to migrate comment schema", e);
            throw e;
        }
    }

    private boolean checkTableExists(String tableName) {
        try {
            String sql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = ?";
            Object result = entityManager.createNativeQuery(sql)
                    .setParameter(1, tableName.toUpperCase())
                    .getSingleResult();
            return ((Number) result).intValue() > 0;
        } catch (Exception e) {
            // H2의 경우 다른 방식으로 확인
            try {
                entityManager.createNativeQuery("SELECT 1 FROM " + tableName + " LIMIT 1").getResultList();
                return true;
            } catch (Exception e2) {
                return false;
            }
        }
    }
}
