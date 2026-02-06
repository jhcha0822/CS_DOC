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
 * 애플리케이션 기동 시 Post 테이블의 스키마 마이그레이션 수행.
 * - category 컬럼을 nullable로 변경
 * - is_notice 컬럼 추가
 * - view_count 컬럼 추가
 * - attachments 컬럼 추가
 * - deleted 컬럼 추가 (soft delete)
 * - current_version_id 컬럼 추가 (버전 관리)
 * - post_version 테이블 생성 (버전 관리)
 */
@Component
@Order(2)
public class PostSchemaMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(PostSchemaMigration.class);

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        try {
            // 1. is_notice 컬럼이 있는지 확인 후 추가
            try {
                // H2에서 컬럼 존재 여부 확인
                String checkColumnSql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = 'POST' AND COLUMN_NAME = 'IS_NOTICE'";
                Long count = ((Number) entityManager.createNativeQuery(checkColumnSql).getSingleResult()).longValue();
                
                if (count == 0) {
                    // 컬럼이 없으면 단계별로 추가
                    // Step 1: nullable로 추가
                    entityManager.createNativeQuery("ALTER TABLE post ADD COLUMN is_notice BOOLEAN DEFAULT FALSE").executeUpdate();
                    // Step 2: 기존 데이터 업데이트
                    entityManager.createNativeQuery("UPDATE post SET is_notice = FALSE WHERE is_notice IS NULL").executeUpdate();
                    // Step 3: NOT NULL 제약 추가
                    entityManager.createNativeQuery("ALTER TABLE post ALTER COLUMN is_notice BOOLEAN NOT NULL").executeUpdate();
                    log.info("Post is_notice column added successfully");
                } else {
                    log.debug("Post is_notice column already exists");
                }
            } catch (Exception e) {
                log.warn("Post is_notice column migration failed. Please run migration script manually: {}", e.getMessage());
            }
            
            // 2. view_count 컬럼 추가
            try {
                String checkColumnSql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = 'POST' AND COLUMN_NAME = 'VIEW_COUNT'";
                Long count = ((Number) entityManager.createNativeQuery(checkColumnSql).getSingleResult()).longValue();
                
                if (count == 0) {
                    entityManager.createNativeQuery("ALTER TABLE post ADD COLUMN view_count BIGINT DEFAULT 0 NOT NULL").executeUpdate();
                    log.info("Post view_count column added successfully");
                } else {
                    log.debug("Post view_count column already exists");
                }
            } catch (Exception e) {
                log.warn("Post view_count column migration failed: {}", e.getMessage());
            }
            
            // 3. attachments 컬럼 추가
            try {
                String checkColumnSql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = 'POST' AND COLUMN_NAME = 'ATTACHMENTS'";
                Long count = ((Number) entityManager.createNativeQuery(checkColumnSql).getSingleResult()).longValue();
                
                if (count == 0) {
                    entityManager.createNativeQuery("ALTER TABLE post ADD COLUMN attachments VARCHAR(2000) NULL").executeUpdate();
                    log.info("Post attachments column added successfully");
                } else {
                    log.debug("Post attachments column already exists");
                }
            } catch (Exception e) {
                log.warn("Post attachments column migration failed: {}", e.getMessage());
            }
            
            // 4. deleted 컬럼 추가
            try {
                String checkColumnSql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = 'POST' AND COLUMN_NAME = 'DELETED'";
                Long count = ((Number) entityManager.createNativeQuery(checkColumnSql).getSingleResult()).longValue();
                
                if (count == 0) {
                    // 컬럼이 없으면 단계별로 추가
                    entityManager.createNativeQuery("ALTER TABLE post ADD COLUMN deleted BOOLEAN DEFAULT FALSE").executeUpdate();
                    entityManager.createNativeQuery("UPDATE post SET deleted = FALSE WHERE deleted IS NULL").executeUpdate();
                    entityManager.createNativeQuery("ALTER TABLE post ALTER COLUMN deleted BOOLEAN NOT NULL").executeUpdate();
                    log.info("Post deleted column added successfully");
                } else {
                    log.debug("Post deleted column already exists");
                }
            } catch (Exception e) {
                log.warn("Post deleted column migration failed: {}", e.getMessage());
            }
            
            // 5. current_version_id 컬럼 추가
            try {
                String checkColumnSql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = 'POST' AND COLUMN_NAME = 'CURRENT_VERSION_ID'";
                Long count = ((Number) entityManager.createNativeQuery(checkColumnSql).getSingleResult()).longValue();
                
                if (count == 0) {
                    entityManager.createNativeQuery("ALTER TABLE post ADD COLUMN current_version_id BIGINT NULL").executeUpdate();
                    log.info("Post current_version_id column added successfully");
                } else {
                    log.debug("Post current_version_id column already exists");
                }
            } catch (Exception e) {
                log.warn("Post current_version_id column migration failed: {}", e.getMessage());
            }
            
            // 6. post_version 테이블 생성
            try {
                String checkTableSql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = 'POST_VERSION'";
                Long count = ((Number) entityManager.createNativeQuery(checkTableSql).getSingleResult()).longValue();
                
                if (count == 0) {
                    entityManager.createNativeQuery("""
                        CREATE TABLE post_version (
                            id BIGINT PRIMARY KEY AUTO_INCREMENT,
                            post_id BIGINT NOT NULL,
                            version_number INT NOT NULL,
                            content_md CLOB NOT NULL,
                            created_by VARCHAR(100) NULL,
                            created_at TIMESTAMP NOT NULL,
                            CONSTRAINT fk_post_version_post FOREIGN KEY (post_id) REFERENCES post(id) ON DELETE CASCADE
                        )
                    """).executeUpdate();
                    
                    // 인덱스 생성
                    entityManager.createNativeQuery("CREATE INDEX idx_post_version_post_id ON post_version(post_id)").executeUpdate();
                    entityManager.createNativeQuery("CREATE INDEX idx_post_version_created_at ON post_version(created_at)").executeUpdate();
                    
                    log.info("Post post_version table created successfully");
                } else {
                    log.debug("Post post_version table already exists");
                }
            } catch (Exception e) {
                log.warn("Post post_version table migration failed: {}", e.getMessage());
            }
            
            // 7. category 컬럼을 nullable로 변경 시도
            try {
                String sql = "ALTER TABLE post ALTER COLUMN category VARCHAR(32) NULL";
                entityManager.createNativeQuery(sql).executeUpdate();
                log.info("Post category column migrated to nullable");
            } catch (Exception e) {
                log.debug("Post category column migration skipped (may not be H2 database or already nullable): {}", e.getMessage());
            }
        } catch (Exception e) {
            log.warn("Post schema migration failed: {}", e.getMessage());
        }
    }
}
