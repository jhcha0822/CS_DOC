package com.fasoo.cs_doc.post.config;

import com.fasoo.cs_doc.post.repository.PostRepository;
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
 * 애플리케이션 기동 시 Post 테이블의 ID 시퀀스를 현재 최대 ID 값으로 동기화.
 * H2 데이터베이스에서 AUTO_INCREMENT 시퀀스가 데이터와 동기화되지 않을 때 발생하는
 * 기본 키 제약 조건 위반 오류를 방지합니다.
 */
@Component
@Order(4)
public class PostSequenceSync implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(PostSequenceSync.class);

    private final PostRepository postRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public PostSequenceSync(PostRepository postRepository) {
        this.postRepository = postRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        try {
            // 현재 Post 테이블의 최대 ID 조회
            Long maxId = postRepository.findAll().stream()
                    .mapToLong(p -> p.getId() != null ? p.getId() : 0L)
                    .max()
                    .orElse(0L);

            if (maxId > 0) {
                // H2 데이터베이스의 AUTO_INCREMENT 시퀀스를 최대 ID + 1로 재설정
                // H2에서는 ALTER TABLE ... ALTER COLUMN ... RESTART WITH 구문 사용
                long nextId = maxId + 1;
                String sql = String.format("ALTER TABLE post ALTER COLUMN id RESTART WITH %d", nextId);
                entityManager.createNativeQuery(sql).executeUpdate();
                log.info("Post ID sequence synchronized: maxId={}, nextId={}", maxId, nextId);
            } else {
                log.debug("Post table is empty, no sequence sync needed");
            }
        } catch (Exception e) {
            // H2가 아닌 다른 데이터베이스(예: MySQL)를 사용하는 경우 무시
            // MySQL에서는 AUTO_INCREMENT가 자동으로 관리되므로 이 작업이 필요 없음
            log.debug("Post sequence sync skipped (may not be H2 database or sequence already synchronized): {}", e.getMessage());
        }
    }
}
