package com.fasoo.cs_doc.assignment.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * 사용자용 "평가가 완료된 실습 제출물이 있습니다" 알림.
 * 관리자가 평가 완료 시 생성, 사용자가 확인 시 read_at 설정.
 */
@Entity
@Table(name = "user_graded_notification", indexes = {
        @Index(name = "idx_user_graded_notification_user_id", columnList = "user_id"),
        @Index(name = "idx_user_graded_notification_read_at", columnList = "read_at")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_graded_notification_user_post", columnNames = {"user_id", "post_id"})
})
public class UserGradedNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "post_id", nullable = false)
    private Long postId;

    @Column(name = "read_at", nullable = true)
    private LocalDateTime readAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected UserGradedNotification() {}

    public UserGradedNotification(Long userId, Long postId) {
        this.userId = userId;
        this.postId = postId;
    }

    @PrePersist
    void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public Long getPostId() { return postId; }
    public LocalDateTime getReadAt() { return readAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    public void markAsRead() {
        this.readAt = LocalDateTime.now();
    }
}
