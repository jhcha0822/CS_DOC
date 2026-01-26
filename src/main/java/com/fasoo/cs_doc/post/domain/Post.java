package com.fasoo.cs_doc.post.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "posts")
public class Post {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    /**
     * ✅ DB에는 본문 텍스트가 아니라 "md 파일 경로(루트 기준 상대경로)"만 저장
     * 예: 2026/01/25/1_abcd1234.md
     */
    @Column(nullable = false, length = 500, unique = true)
    private String contentMdPath;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    protected Post() {}

    public Post(String title, String contentMdPath) {
        this.title = title;
        this.contentMdPath = contentMdPath;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
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

    public void changeTitle(String title) { this.title = title; }
    public void changeContentMdPath(String contentMdPath) { this.contentMdPath = contentMdPath; }
}
