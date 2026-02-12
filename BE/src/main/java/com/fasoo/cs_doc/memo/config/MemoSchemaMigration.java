package com.fasoo.cs_doc.memo.config;

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
 * memo 테이블이 없으면 생성 (H2 등).
 */
@Component
@Order(3)
public class MemoSchemaMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(MemoSchemaMigration.class);

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        try {
            String checkTableSql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = 'MEMO'";
            Long count = ((Number) entityManager.createNativeQuery(checkTableSql).getSingleResult()).longValue();
            if (count == 0) {
                entityManager.createNativeQuery("""
                    CREATE TABLE memo (
                        id BIGINT PRIMARY KEY AUTO_INCREMENT,
                        title VARCHAR(500) NOT NULL,
                        body CLOB,
                        images VARCHAR(4000),
                        created_at TIMESTAMP NOT NULL,
                        updated_at TIMESTAMP NOT NULL
                    )
                """).executeUpdate();
                entityManager.createNativeQuery("CREATE INDEX idx_memo_updated_at ON memo(updated_at)").executeUpdate();
                entityManager.createNativeQuery("CREATE INDEX idx_memo_title_body ON memo(title)").executeUpdate();
                log.info("Memo table created successfully");
            }
        } catch (Exception e) {
            log.warn("Memo schema migration failed (table may already exist or not H2): {}", e.getMessage());
        }
    }
}
