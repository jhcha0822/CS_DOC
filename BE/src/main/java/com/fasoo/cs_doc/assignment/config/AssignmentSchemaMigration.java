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
 * 새 구조 마이그레이션: assignment_submission에 answer_md_path 추가, assignment_review 테이블 생성. H2 전용.
 */
@Component
@Profile("test")
@Order(4)
public class AssignmentSchemaMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AssignmentSchemaMigration.class);

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        try {
            // 1. assignment_submission에 answer_md_path 컬럼 추가
            String checkAnswerPathSql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = 'ASSIGNMENT_SUBMISSION' AND COLUMN_NAME = 'ANSWER_MD_PATH'";
            Long answerPathCount = ((Number) entityManager.createNativeQuery(checkAnswerPathSql).getSingleResult()).longValue();
            if (answerPathCount == 0) {
                log.info("assignment_submission 테이블에 answer_md_path 컬럼 추가 중...");
                entityManager.createNativeQuery("ALTER TABLE assignment_submission ADD COLUMN answer_md_path VARCHAR(500)").executeUpdate();
                log.info("assignment_submission 테이블에 answer_md_path 컬럼 추가 완료.");
            }

            // 2. assignment_review 테이블 생성
            String checkReviewTableSql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = 'ASSIGNMENT_REVIEW'";
            Long reviewTableCount = ((Number) entityManager.createNativeQuery(checkReviewTableSql).getSingleResult()).longValue();
            if (reviewTableCount == 0) {
                log.info("assignment_review 테이블 생성 중...");
                entityManager.createNativeQuery("""
                    CREATE TABLE assignment_review (
                        id BIGINT PRIMARY KEY AUTO_INCREMENT,
                        submission_id BIGINT NOT NULL UNIQUE,
                        reviewer_id BIGINT,
                        score INTEGER NOT NULL,
                        feedback_text VARCHAR(2000),
                        reviewed_at TIMESTAMP NOT NULL
                    )
                """).executeUpdate();
                entityManager.createNativeQuery("CREATE INDEX idx_assignment_review_submission_id ON assignment_review(submission_id)").executeUpdate();
                log.info("assignment_review 테이블 생성 완료.");
            }

            // 3. post에 max_score 컬럼 추가
            String checkPostMaxScoreSql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'PUBLIC' AND TABLE_NAME = 'POST' AND COLUMN_NAME = 'MAX_SCORE'";
            Long postMaxScoreCount = ((Number) entityManager.createNativeQuery(checkPostMaxScoreSql).getSingleResult()).longValue();
            if (postMaxScoreCount == 0) {
                log.info("post 테이블에 max_score 컬럼 추가 중...");
                entityManager.createNativeQuery("ALTER TABLE post ADD COLUMN max_score INTEGER").executeUpdate();
                log.info("post 테이블에 max_score 컬럼 추가 완료.");
            }
        } catch (Exception e) {
            log.error("Assignment 스키마 마이그레이션 중 오류 발생", e);
        }
    }
}
