package com.fasoo.cs_doc.member.config;

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
 * members 테이블에 name 컬럼이 없으면 추가하는 마이그레이션.
 * H2 콘솔 접근이 어려운 경우를 대비하여 애플리케이션 시작 시 자동으로 실행.
 */
@Component
@Order(1) // UserDataLoader보다 먼저 실행
public class MemberSchemaMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(MemberSchemaMigration.class);

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        try {
            // members 테이블에 name 컬럼이 있는지 확인
            String checkColumnSql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = 'MEMBERS' AND COLUMN_NAME = 'NAME'";
            Long count = ((Number) entityManager.createNativeQuery(checkColumnSql).getSingleResult()).longValue();
            
            if (count == 0) {
                log.info("members 테이블에 name 컬럼이 없습니다. 추가합니다...");
                
                // Step 1: 컬럼 추가 (기본값 설정, nullable)
                entityManager.createNativeQuery("ALTER TABLE members ADD COLUMN name VARCHAR(100) DEFAULT '사용자'").executeUpdate();
                
                // Step 2: 기존 데이터에 username을 name으로 설정
                entityManager.createNativeQuery("UPDATE members SET name = username WHERE name IS NULL OR name = '사용자'").executeUpdate();
                
                // Step 3: NOT NULL 제약조건 추가
                entityManager.createNativeQuery("ALTER TABLE members ALTER COLUMN name SET NOT NULL").executeUpdate();
                
                log.info("members 테이블에 name 컬럼 추가 완료.");
            } else {
                log.debug("members 테이블에 name 컬럼이 이미 존재합니다.");
            }
        } catch (Exception e) {
            log.error("members 테이블 스키마 마이그레이션 중 오류 발생", e);
            // 오류가 발생해도 애플리케이션은 계속 실행되도록 함
        }
    }
}
