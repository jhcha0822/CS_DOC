package com.fasoo.cs_doc.post.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "post",
        indexes = {
                @Index(name = "idx_posts_created_at", columnList = "createdAt")
        }
)
public class Post {

    private static final int TITLE_MAX_LENGTH = 200;
    private static final int PATH_MAX_LENGTH = 500;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = TITLE_MAX_LENGTH)
    private String title;

    /**
     * DB에는 본문 텍스트가 아니라 "md 파일 경로(루트 기준 상대경로)"만 저장
     * 예: 2026/01/25/1_abcd1234.md
     */
    @Column(nullable = true, length = PATH_MAX_LENGTH, unique = true)
    private String contentMdPath;

    @Enumerated(EnumType.STRING)
    @Column(nullable = true, length = 32)
    private PostCategory category; // Deprecated: 기존 데이터 호환성을 위해 유지하되, 새로 생성되는 게시글에는 사용하지 않음

    @Column(name = "category_id", nullable = false)
    private Long categoryId;

    @Column(name = "is_notice", nullable = false)
    private Boolean isNotice = false;

    @Column(name = "view_count", nullable = false)
    private Long viewCount = 0L;

    @Column(name = "attachments", nullable = true, length = 2000)
    private String attachments; // JSON array of attachment file paths

    @Column(name = "deleted", nullable = false)
    private Boolean deleted = false; // Soft delete flag

    /**
     * 현재 버전 ID (PostVersion 테이블 참조)
     * 게시글 내용이 변경될 때마다 새로운 버전이 생성되고 이 필드가 업데이트됩니다.
     */
    @Column(name = "current_version_id", nullable = true)
    private Long currentVersionId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected Post() {}

    public Post(String title, String contentMdPath) {
        changeTitle(title);
        changeContentMdPath(contentMdPath); // 생성 시 null 허용하고 싶으면 유지
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getContentMdPath() { return contentMdPath; }
    public PostCategory getCategory() { return category; }
    public Long getCategoryId() { return categoryId; }
    public Boolean getIsNotice() { return isNotice != null ? isNotice : false; }
    public Long getViewCount() { return viewCount != null ? viewCount : 0L; }
    public String getAttachments() { return attachments; }
    public Boolean getDeleted() { return deleted != null ? deleted : false; }
    public Long getCurrentVersionId() { return currentVersionId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public void changeTitle(String title) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("title must not be blank");
        }
        if (title.length() > TITLE_MAX_LENGTH) {
            throw new IllegalArgumentException("title length must be <= " + TITLE_MAX_LENGTH);
        }
        this.title = title;
    }

    /**
     * contentMdPath는 create 과정에서 "일단 null"로 두고 나중에 세팅하는 전략이면
     * null 허용 유지하는 게 맞음.
     * (그래서 여기서는 null/blank를 강제하지 않음)
     */
    public void changeContentMdPath(String contentMdPath) {
        if (contentMdPath == null) {
            this.contentMdPath = null;
            return;
        }
        String trimmed = contentMdPath.trim();
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("contentMdPath must not be blank");
        }
        if (trimmed.length() > PATH_MAX_LENGTH) {
            throw new IllegalArgumentException("contentMdPath length must be <= " + PATH_MAX_LENGTH);
        }
        // 경로 조작 최소 방어 (선택)
        if (trimmed.contains("..")) {
            throw new IllegalArgumentException("contentMdPath contains invalid sequence(..)");
        }
        this.contentMdPath = trimmed;
    }

    /**
     * @deprecated categoryId만 사용하세요. 기존 데이터 호환성을 위해 유지됨.
     */
    @Deprecated
    public void changeCategory(PostCategory category) {
        this.category = category; // null 허용 (더 이상 사용하지 않음)
    }

    public void changeCategoryId(Long categoryId) {
        if (categoryId == null) {
            throw new IllegalArgumentException("categoryId must not be null");
        }
        this.categoryId = categoryId;
    }

    public void changeIsNotice(Boolean isNotice) {
        this.isNotice = isNotice != null ? isNotice : false;
    }

    public void incrementViewCount() {
        this.viewCount = (this.viewCount == null ? 0L : this.viewCount) + 1L;
    }

    public void changeAttachments(String attachments) {
        this.attachments = attachments; // null 허용
    }

    public void markAsDeleted() {
        this.deleted = true;
    }

    public void restore() {
        this.deleted = false;
    }

    public void changeCurrentVersionId(Long currentVersionId) {
        this.currentVersionId = currentVersionId;
    }
}
