package com.fasoo.cs_doc.config;

import com.fasoo.cs_doc.category.config.CategoryDataLoader;
import com.fasoo.cs_doc.category.repository.CategoryRepository;
import com.fasoo.cs_doc.global.config.StorageProperties;
import com.fasoo.cs_doc.post.repository.PostRepository;
import com.fasoo.cs_doc.post.repository.PostVersionRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * 카테고리·게시글 데이터 초기화 서비스.
 * data-init 프로필로 실행 시 모든 게시글·버전·카테고리를 삭제 후, 기본 카테고리만 재생성.
 * Post ID 시퀀스 1부터 재시작, md 파일 정리 포함.
 * 사용: java -jar app.jar --spring.profiles.active=data-init
 */
@Service
public class DataInitService {

    private static final Logger log = LoggerFactory.getLogger(DataInitService.class);

    private final PostVersionRepository postVersionRepository;
    private final PostRepository postRepository;
    private final CategoryRepository categoryRepository;
    private final ApplicationContext applicationContext;
    private final StorageProperties storageProperties;

    @PersistenceContext
    private EntityManager entityManager;

    public DataInitService(
            PostVersionRepository postVersionRepository,
            PostRepository postRepository,
            CategoryRepository categoryRepository,
            ApplicationContext applicationContext,
            StorageProperties storageProperties) {
        this.postVersionRepository = postVersionRepository;
        this.postRepository = postRepository;
        this.categoryRepository = categoryRepository;
        this.applicationContext = applicationContext;
        this.storageProperties = storageProperties;
    }

    /**
     * 모든 게시글·버전·카테고리 삭제 후 기본 카테고리 재생성.
     * FK 순서: post_version → post → category
     * ID 시퀀스를 1부터 재시작, posts/*.md 파일 삭제
     */
    @Transactional
    public void resetAll() {
        log.info("데이터 초기화 시작: post_version, post, category 삭제 후 카테고리 재생성");

        long postVersionCount = postVersionRepository.count();
        long postCount = postRepository.count();
        long categoryCount = categoryRepository.count();

        postVersionRepository.deleteAllInBatch();
        log.info("post_version {}건 삭제 완료", postVersionCount);

        postRepository.deleteAllInBatch();
        log.info("post {}건 삭제 완료", postCount);

        categoryRepository.deleteAllInBatch();
        log.info("category {}건 삭제 완료", categoryCount);

        // H2 ID 시퀀스 1부터 재시작
        try {
            entityManager.createNativeQuery("ALTER TABLE post_version ALTER COLUMN id RESTART WITH 1").executeUpdate();
            entityManager.createNativeQuery("ALTER TABLE post ALTER COLUMN id RESTART WITH 1").executeUpdate();
            entityManager.createNativeQuery("ALTER TABLE category ALTER COLUMN id RESTART WITH 1").executeUpdate();
            log.info("post_version, post, category ID 시퀀스 1부터 재시작 완료");
        } catch (Exception e) {
            log.warn("ID 시퀀스 재시작 실패 (H2가 아닐 수 있음): {}", e.getMessage());
        }

        // CategoryDataLoader 로직 재실행 (기본 카테고리 생성)
        CategoryDataLoader loader = applicationContext.getBean(CategoryDataLoader.class);
        loader.run(new DefaultApplicationArguments(new String[0]));

        // posts/*.md 파일 삭제 (기존 md와 ID 충돌 방지)
        deletePostsMdFiles();

        log.info("데이터 초기화 완료: 신입 교육 자료, 공지사항, 기존 인력 교육 카테고리 생성, ID 시퀀스 1부터 시작");
    }

    private void deletePostsMdFiles() {
        if (storageProperties.mdRoot() == null || storageProperties.mdRoot().isBlank()) return;
        Path postsDir = Path.of(storageProperties.mdRoot()).resolve("posts");
        if (!Files.isDirectory(postsDir)) return;
        try (var stream = Files.list(postsDir)) {
            var mdFiles = stream.filter(p -> p.toString().endsWith(".md")).toList();
            for (Path p : mdFiles) {
                Files.deleteIfExists(p);
            }
            log.info("posts/*.md {}건 삭제 완료", mdFiles.size());
        } catch (IOException e) {
            log.warn("posts md 파일 삭제 실패: {}", e.getMessage());
        }
    }
}
