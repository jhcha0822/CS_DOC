package com.fasoo.cs_doc.post.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "comment",
        indexes = {
                @Index(name = "idx_comment_post_id", columnList = "postId"),
                @Index(name = "idx_comment_created_at", columnList = "createdAt")
        }
)
public class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "post_id", nullable = false)
    private Long postId;

    @Column(nullable = false, length = 5000)
    private String content;

    /**
     * 작성자 사용자 ID
     */
    @Column(name = "created_by", nullable = true)
    private Long createdBy;

    /**
     * 수정자 사용자 ID
     */
    @Column(name = "updated_by", nullable = true)
    private Long updatedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected Comment() {}

    public Comment(Long postId, String content) {
        this.postId = postId;
        this.content = content;
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
    public Long getPostId() { return postId; }
    public String getContent() { return content; }
    public Long getCreatedBy() { return createdBy; }
    public Long getUpdatedBy() { return updatedBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public void changeContent(String content) {
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("content must not be blank");
        }
        if (content.length() > 5000) {
            throw new IllegalArgumentException("content length must be <= 5000");
        }
        this.content = content.trim();
    }

    public void changeCreatedBy(Long createdBy) {
        this.createdBy = createdBy;
    }

    public void changeUpdatedBy(Long updatedBy) {
        this.updatedBy = updatedBy;
    }
}
