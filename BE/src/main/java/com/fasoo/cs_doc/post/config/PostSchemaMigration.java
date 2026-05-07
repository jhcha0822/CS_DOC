package com.fasoo.cs_doc.post.config;

import com.fasoo.cs_doc.post.service.PostContentStorage;
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

import java.util.List;

/**
 * 애플리케이션 기동 시 Post 테이블의 스키마 마이그레이션 수행. H2 전용.
 * - category 컬럼을 nullable로 변경
 * - is_notice 컬럼 추가
 * - view_count 컬럼 추가
 * - attachments 컬럼 추가
 * - deleted 컬럼 추가 (soft delete)
 * - current_version_id 컬럼 추가 (버전 관리)
 * - post_version 테이블 생성 (버전 관리)
 * - post_version content_md → content_md_path (md 파일로 저장)
 */
@Component
@Profile("test")
@Order(2)
public class PostSchemaMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(PostSchemaMigration.class);

    @PersistenceContext
    private EntityManager entityManager;

    private final PostContentStorage storage;

    public PostSchemaMigration(PostContentStorage storage) {
        this.storage = storage;
    }

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

            // 4b. deletion_reason (소프트 삭제 사유)
            try {
                String checkColumnSql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = 'POST' AND COLUMN_NAME = 'DELETION_REASON'";
                Long count = ((Number) entityManager.createNativeQuery(checkColumnSql).getSingleResult()).longValue();
                if (count == 0) {
                    entityManager.createNativeQuery("ALTER TABLE post ADD COLUMN deletion_reason VARCHAR(2000) NULL").executeUpdate();
                    log.info("Post deletion_reason column added successfully");
                } else {
                    log.debug("Post deletion_reason column already exists");
                }
            } catch (Exception e) {
                log.warn("Post deletion_reason column migration failed: {}", e.getMessage());
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
            
            // 5-1. summary_title 컬럼 추가
            try {
                String checkColumnSql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = 'POST' AND COLUMN_NAME = 'SUMMARY_TITLE'";
                Long count = ((Number) entityManager.createNativeQuery(checkColumnSql).getSingleResult()).longValue();
                
                if (count == 0) {
                    entityManager.createNativeQuery("ALTER TABLE post ADD COLUMN summary_title VARCHAR(200) NULL").executeUpdate();
                    log.info("Post summary_title column added successfully");
                } else {
                    log.debug("Post summary_title column already exists");
                }
            } catch (Exception e) {
                log.warn("Post summary_title column migration failed: {}", e.getMessage());
            }
            
            // 6. post_version 테이블 생성 (content_md_path 사용)
            try {
                String checkTableSql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = 'POST_VERSION'";
                Long count = ((Number) entityManager.createNativeQuery(checkTableSql).getSingleResult()).longValue();
                
                if (count == 0) {
                    entityManager.createNativeQuery("""
                        CREATE TABLE post_version (
                            id BIGINT PRIMARY KEY AUTO_INCREMENT,
                            post_id BIGINT NOT NULL,
                            version_number INT NOT NULL,
                            title VARCHAR(200) NULL,
                            content_md_path VARCHAR(500) NOT NULL,
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
            
            // 6-1. post_version content_md → content_md_path 마이그레이션 (기존 DB용)
            try {
                String checkContentMdPath = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = 'POST_VERSION' AND COLUMN_NAME = 'CONTENT_MD_PATH'";
                String checkContentMd = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = 'POST_VERSION' AND COLUMN_NAME = 'CONTENT_MD'";
                Long hasPath = ((Number) entityManager.createNativeQuery(checkContentMdPath).getSingleResult()).longValue();
                Long hasContent = ((Number) entityManager.createNativeQuery(checkContentMd).getSingleResult()).longValue();
                
                if (hasPath == 0 && hasContent > 0) {
                    entityManager.createNativeQuery("ALTER TABLE post_version ADD COLUMN content_md_path VARCHAR(500) NULL").executeUpdate();
                    @SuppressWarnings("unchecked")
                    List<Object[]> rows = entityManager.createNativeQuery(
                            "SELECT id, post_id, version_number, content_md FROM post_version"
                    ).getResultList();
                    for (Object[] row : rows) {
                        Long id = ((Number) row[0]).longValue();
                        Long postId = ((Number) row[1]).longValue();
                        Integer versionNumber = ((Number) row[2]).intValue();
                        String contentMd = row[3] != null ? row[3].toString() : "";
                        String mdPath = storage.writeVersion(postId, versionNumber, contentMd);
                        entityManager.createNativeQuery("UPDATE post_version SET content_md_path = :path WHERE id = :id")
                                .setParameter("path", mdPath)
                                .setParameter("id", id)
                                .executeUpdate();
                    }
                    entityManager.createNativeQuery("ALTER TABLE post_version DROP COLUMN content_md").executeUpdate();
                    entityManager.createNativeQuery("ALTER TABLE post_version ALTER COLUMN content_md_path VARCHAR(500) NOT NULL").executeUpdate();
                    log.info("Post post_version content_md → content_md_path migration completed");
                }
            } catch (Exception e) {
                log.warn("Post post_version content_md_path migration failed: {}", e.getMessage());
            }
            
            // 6-2. post_version 테이블에 title 컬럼 추가 (기존 테이블용)
            try {
                String checkTableSql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = 'POST_VERSION'";
                Long tableCount = ((Number) entityManager.createNativeQuery(checkTableSql).getSingleResult()).longValue();
                if (tableCount > 0) {
                    String checkColumnSql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = 'POST_VERSION' AND COLUMN_NAME = 'TITLE'";
                    Long colCount = ((Number) entityManager.createNativeQuery(checkColumnSql).getSingleResult()).longValue();
                    if (colCount == 0) {
                        entityManager.createNativeQuery("ALTER TABLE post_version ADD COLUMN title VARCHAR(200) NULL").executeUpdate();
                        log.info("Post post_version title column added successfully");
                    }
                }
            } catch (Exception e) {
                log.warn("Post post_version title column migration failed: {}", e.getMessage());
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
