package com.fasoo.cs_doc.post.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "posts",
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

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
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
}
