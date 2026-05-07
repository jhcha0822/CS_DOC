package com.fasoo.cs_doc.config;

import com.fasoo.cs_doc.assignment.repository.AdminGradingNotificationRepository;
import com.fasoo.cs_doc.assignment.repository.AssignmentRequestRepository;
import com.fasoo.cs_doc.assignment.repository.UserGradedNotificationRepository;
import com.fasoo.cs_doc.assignment.repository.*;
import com.fasoo.cs_doc.category.config.CategoryDataLoader;
import com.fasoo.cs_doc.category.repository.CategoryRepository;
import com.fasoo.cs_doc.global.config.StorageProperties;
import com.fasoo.cs_doc.memo.repository.DeletedMemoRepository;
import com.fasoo.cs_doc.memo.repository.MemoRepository;
import com.fasoo.cs_doc.post.repository.CommentRepository;
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
 * 카테고리·게시글·메모·실습(과제)·댓글 데이터 초기화 서비스.
 * data-init 프로필로 실행 시 실습/댓글/게시글/버전/메모/카테고리를 모두 삭제 후, 기본 카테고리만 재생성.
 * User(회원) 테이블은 초기화하지 않음.
 * Post/Memo ID 시퀀스 1부터 재시작, posts/*.md 및 assignments/* 디스크 정리 포함.
 * 사용: java -jar app.jar --spring.profiles.active=data-init
 */
@Service
public class DataInitService {

    private static final Logger log = LoggerFactory.getLogger(DataInitService.class);

    private final AssignmentTaskReviewRepository assignmentTaskReviewRepository;
    private final AssignmentReviewRepository assignmentReviewRepository;
    private final AssignmentTaskSubmissionRepository assignmentTaskSubmissionRepository;
    private final AssignmentSubmissionRepository assignmentSubmissionRepository;
    private final AssignmentRequestRepository assignmentRequestRepository;
    private final AdminGradingNotificationRepository adminGradingNotificationRepository;
    private final UserGradedNotificationRepository userGradedNotificationRepository;
    private final AssignmentTaskRepository assignmentTaskRepository;
    private final CommentRepository commentRepository;
    private final PostVersionRepository postVersionRepository;
    private final PostRepository postRepository;
    private final MemoRepository memoRepository;
    private final DeletedMemoRepository deletedMemoRepository;
    private final CategoryRepository categoryRepository;
    private final ApplicationContext applicationContext;
    private final StorageProperties storageProperties;

    @PersistenceContext
    private EntityManager entityManager;

    public DataInitService(
            AssignmentTaskReviewRepository assignmentTaskReviewRepository,
            AssignmentReviewRepository assignmentReviewRepository,
            AssignmentTaskSubmissionRepository assignmentTaskSubmissionRepository,
            AssignmentSubmissionRepository assignmentSubmissionRepository,
            AssignmentRequestRepository assignmentRequestRepository,
            AdminGradingNotificationRepository adminGradingNotificationRepository,
            UserGradedNotificationRepository userGradedNotificationRepository,
            AssignmentTaskRepository assignmentTaskRepository,
            CommentRepository commentRepository,
            PostVersionRepository postVersionRepository,
            PostRepository postRepository,
            MemoRepository memoRepository,
            DeletedMemoRepository deletedMemoRepository,
            CategoryRepository categoryRepository,
            ApplicationContext applicationContext,
            StorageProperties storageProperties) {
        this.assignmentTaskReviewRepository = assignmentTaskReviewRepository;
        this.assignmentReviewRepository = assignmentReviewRepository;
        this.assignmentTaskSubmissionRepository = assignmentTaskSubmissionRepository;
        this.assignmentSubmissionRepository = assignmentSubmissionRepository;
        this.assignmentRequestRepository = assignmentRequestRepository;
        this.adminGradingNotificationRepository = adminGradingNotificationRepository;
        this.userGradedNotificationRepository = userGradedNotificationRepository;
        this.assignmentTaskRepository = assignmentTaskRepository;
        this.commentRepository = commentRepository;
        this.postVersionRepository = postVersionRepository;
        this.postRepository = postRepository;
        this.memoRepository = memoRepository;
        this.deletedMemoRepository = deletedMemoRepository;
        this.categoryRepository = categoryRepository;
        this.applicationContext = applicationContext;
        this.storageProperties = storageProperties;
    }

    /**
     * 실습(과제)·댓글·게시글·버전·메모·카테고리 삭제 후 기본 카테고리 재생성.
     * FK 순서: assignment_task_review → ... → post → memo(독립) → category
     * ID 시퀀스 1부터 재시작, posts/*.md 및 assignments/* 디스크 정리
     */
    @Transactional
    public void resetAll() {
        log.info("데이터 초기화 시작: 실습·댓글·post_version·post·memo·category 삭제 후 카테고리 재생성 (User 미초기화)");

        long n1 = assignmentTaskReviewRepository.count();
        assignmentTaskReviewRepository.deleteAllInBatch();
        log.info("assignment_task_review {}건 삭제 완료", n1);

        long n2 = assignmentReviewRepository.count();
        assignmentReviewRepository.deleteAllInBatch();
        log.info("assignment_review {}건 삭제 완료", n2);

        long n3 = assignmentTaskSubmissionRepository.count();
        assignmentTaskSubmissionRepository.deleteAllInBatch();
        log.info("assignment_task_submission {}건 삭제 완료", n3);

        long n4 = assignmentSubmissionRepository.count();
        assignmentSubmissionRepository.deleteAllInBatch();
        log.info("assignment_submission {}건 삭제 완료", n4);

        try {
            long n4a = assignmentRequestRepository.count();
            assignmentRequestRepository.deleteAllInBatch();
            log.info("assignment_request {}건 삭제 완료", n4a);
        } catch (Exception e) {
            log.debug("assignment_request 삭제 생략 (테이블 없을 수 있음): {}", e.getMessage());
        }
        try {
            long n4b = adminGradingNotificationRepository.count();
            adminGradingNotificationRepository.deleteAllInBatch();
            log.info("admin_grading_notification {}건 삭제 완료", n4b);
        } catch (Exception e) {
            log.debug("admin_grading_notification 삭제 생략: {}", e.getMessage());
        }
        try {
            long n4c = userGradedNotificationRepository.count();
            userGradedNotificationRepository.deleteAllInBatch();
            log.info("user_graded_notification {}건 삭제 완료", n4c);
        } catch (Exception e) {
            log.debug("user_graded_notification 삭제 생략: {}", e.getMessage());
        }

        long n5 = assignmentTaskRepository.count();
        assignmentTaskRepository.deleteAllInBatch();
        log.info("assignment_task {}건 삭제 완료", n5);

        long commentCount = commentRepository.count();
        commentRepository.deleteAllInBatch();
        log.info("comment {}건 삭제 완료", commentCount);

        long postVersionCount = postVersionRepository.count();
        postVersionRepository.deleteAllInBatch();
        log.info("post_version {}건 삭제 완료", postVersionCount);

        long postCount = postRepository.count();
        postRepository.deleteAllInBatch();
        log.info("post {}건 삭제 완료", postCount);

        try {
            long deletedMemoCount = deletedMemoRepository.count();
            deletedMemoRepository.deleteAllInBatch();
            log.info("deleted_memo {}건 삭제 완료", deletedMemoCount);
        } catch (Exception e) {
            log.debug("deleted_memo 삭제 생략: {}", e.getMessage());
        }

        long memoCount = memoRepository.count();
        memoRepository.deleteAllInBatch();
        log.info("memo {}건 삭제 완료", memoCount);

        long categoryCount = categoryRepository.count();
        categoryRepository.deleteAllInBatch();
        log.info("category {}건 삭제 완료", categoryCount);

        // H2 ID 시퀀스 1부터 재시작
        try {
            entityManager.createNativeQuery("ALTER TABLE assignment_task_review ALTER COLUMN id RESTART WITH 1").executeUpdate();
            entityManager.createNativeQuery("ALTER TABLE assignment_review ALTER COLUMN id RESTART WITH 1").executeUpdate();
            entityManager.createNativeQuery("ALTER TABLE assignment_task_submission ALTER COLUMN id RESTART WITH 1").executeUpdate();
            entityManager.createNativeQuery("ALTER TABLE assignment_submission ALTER COLUMN id RESTART WITH 1").executeUpdate();
            try {
                entityManager.createNativeQuery("ALTER TABLE assignment_request ALTER COLUMN id RESTART WITH 1").executeUpdate();
            } catch (Exception ignored) {}
            try {
                entityManager.createNativeQuery("ALTER TABLE admin_grading_notification ALTER COLUMN id RESTART WITH 1").executeUpdate();
            } catch (Exception ignored) {}
            try {
                entityManager.createNativeQuery("ALTER TABLE user_graded_notification ALTER COLUMN id RESTART WITH 1").executeUpdate();
            } catch (Exception ignored) {}
            entityManager.createNativeQuery("ALTER TABLE assignment_task ALTER COLUMN id RESTART WITH 1").executeUpdate();
            entityManager.createNativeQuery("ALTER TABLE comment ALTER COLUMN id RESTART WITH 1").executeUpdate();
            entityManager.createNativeQuery("ALTER TABLE post_version ALTER COLUMN id RESTART WITH 1").executeUpdate();
            entityManager.createNativeQuery("ALTER TABLE post ALTER COLUMN id RESTART WITH 1").executeUpdate();
            entityManager.createNativeQuery("ALTER TABLE memo ALTER COLUMN id RESTART WITH 1").executeUpdate();
            try {
                entityManager.createNativeQuery("ALTER TABLE deleted_memo ALTER COLUMN id RESTART WITH 1").executeUpdate();
            } catch (Exception ignored) {}
            entityManager.createNativeQuery("ALTER TABLE category ALTER COLUMN id RESTART WITH 1").executeUpdate();
            log.info("모든 테이블 ID 시퀀스 1부터 재시작 완료");
        } catch (Exception e) {
            log.warn("ID 시퀀스 재시작 실패 (H2가 아닐 수 있음): {}", e.getMessage());
        }

        // CategoryDataLoader 로직 재실행 (기본 카테고리 생성)
        CategoryDataLoader loader = applicationContext.getBean(CategoryDataLoader.class);
        loader.run(new DefaultApplicationArguments(new String[0]));

        deletePostsMdFiles();
        deleteAssignmentsDir();

        log.info("데이터 초기화 완료: 실습·댓글·게시글·버전·메모 삭제, 기본 카테고리만 유지, ID 시퀀스 1부터 시작 (User 유지)");
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

    /** assignments/ 디렉터리 전체 삭제 (실습 세부 과제·사용자 답변 md 등) */
    private void deleteAssignmentsDir() {
        if (storageProperties.mdRoot() == null || storageProperties.mdRoot().isBlank()) return;
        Path assignmentsDir = Path.of(storageProperties.mdRoot()).resolve("assignments");
        if (!Files.isDirectory(assignmentsDir)) return;
        try {
            try (var stream = Files.walk(assignmentsDir)) {
                stream.sorted((a, b) -> -a.compareTo(b)).forEach(p -> {
                    try {
                        Files.deleteIfExists(p);
                    } catch (IOException e) {
                        log.warn("assignments 파일 삭제 실패 {}: {}", p, e.getMessage());
                    }
                });
            }
            Files.deleteIfExists(assignmentsDir);
            log.info("assignments/ 디렉터리 삭제 완료");
        } catch (IOException e) {
            log.warn("assignments 디렉터리 삭제 실패: {}", e.getMessage());
        }
    }
}
