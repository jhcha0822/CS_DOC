package com.fasoo.cs_doc.memo.config;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * MSSQL에서 {@code deleted_memo} 테이블이 없을 때 자동 생성.
 * (수동 스크립트: {@code migration_deleted_memo.sql} 과 동일)
 */
@Component
@Order(1)
public class DeletedMemoSchemaMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DeletedMemoSchemaMigration.class);

    private final Environment environment;

    @PersistenceContext
    private EntityManager entityManager;

    public DeletedMemoSchemaMigration(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void run(ApplicationArguments args) {
        String url = environment.getProperty("spring.datasource.url", "");
        if (url.isBlank() || !url.contains("sqlserver")) {
            return;
        }
        try {
            Number cnt = (Number) entityManager.createNativeQuery(
                    """
                            SELECT COUNT(*) FROM sys.tables
                            WHERE name = 'deleted_memo' AND schema_id = SCHEMA_ID('dbo')
                            """
            ).getSingleResult();
            if (cnt != null && cnt.longValue() > 0) {
                return;
            }
            entityManager.createNativeQuery(
                    """
                            CREATE TABLE dbo.deleted_memo (
                                id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                                source_memo_id BIGINT NOT NULL,
                                title NVARCHAR(500) NOT NULL,
                                body NVARCHAR(MAX) NULL,
                                images NVARCHAR(4000) NULL,
                                original_created_at DATETIME2 NOT NULL,
                                original_created_by BIGINT NULL,
                                original_updated_by BIGINT NULL,
                                deleted_at DATETIME2 NOT NULL,
                                deleted_by BIGINT NULL,
                                deletion_reason NVARCHAR(2000) NOT NULL
                            )
                            """
            ).executeUpdate();

            entityManager.createNativeQuery(
                    """
                            IF NOT EXISTS (
                                SELECT 1 FROM sys.indexes
                                WHERE name = N'idx_deleted_memo_deleted_at'
                                  AND object_id = OBJECT_ID(N'dbo.deleted_memo')
                            )
                            CREATE INDEX idx_deleted_memo_deleted_at ON dbo.deleted_memo (deleted_at)
                            """
            ).executeUpdate();

            log.info("deleted_memo 테이블을 생성했습니다 (MSSQL).");
        } catch (Exception e) {
            log.warn("deleted_memo 테이블 자동 생성 실패 — migration_deleted_memo.sql 을 수동 실행하세요: {}", e.getMessage());
        }
    }
}
