package com.fasoo.cs_doc.category.config;

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
 * category 테이블에 admin_only / sidebar_visible 컬럼이 없으면 추가하는 마이그레이션. H2 전용.
 */
@Component
@Profile("test")
@Order(0)
public class CategorySchemaMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(CategorySchemaMigration.class);

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        try {
            String checkColumnSql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = 'CATEGORY' AND COLUMN_NAME = 'ADMIN_ONLY'";
            Long count = ((Number) entityManager.createNativeQuery(checkColumnSql).getSingleResult()).longValue();

            if (count == 0) {
                log.info("category 테이블에 admin_only 컬럼 추가 중...");
                entityManager.createNativeQuery("ALTER TABLE category ADD COLUMN admin_only BOOLEAN DEFAULT FALSE NOT NULL").executeUpdate();
                log.info("category admin_only 컬럼 추가 완료.");
            } else {
                log.debug("category admin_only 컬럼이 이미 존재합니다.");
            }

            String checkSidebarSql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = 'CATEGORY' AND COLUMN_NAME = 'SIDEBAR_VISIBLE'";
            Long sidebarCount = ((Number) entityManager.createNativeQuery(checkSidebarSql).getSingleResult()).longValue();
            if (sidebarCount == 0) {
                log.info("category 테이블에 sidebar_visible 컬럼 추가 중...");
                entityManager.createNativeQuery("ALTER TABLE category ADD COLUMN sidebar_visible BOOLEAN DEFAULT TRUE NOT NULL").executeUpdate();
                log.info("category sidebar_visible 컬럼 추가 완료.");
            } else {
                log.debug("category sidebar_visible 컬럼이 이미 존재합니다.");
            }
        } catch (Exception e) {
            log.warn("category schema 마이그레이션 실패: {}", e.getMessage());
        }
    }
}
