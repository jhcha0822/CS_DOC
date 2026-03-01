package com.fasoo.cs_doc.assignment.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * 관리자용 "평가가 필요한 과제" 알림.
 * 사용자 제출 시 생성, 관리자가 확인 시 read_at 설정, 해당 실습 전체 평가 완료 시 삭제.
 */
@Entity
@Table(name = "admin_grading_notification", indexes = {
        @Index(name = "idx_admin_grading_notification_admin_id", columnList = "admin_id"),
        @Index(name = "idx_admin_grading_notification_read_at", columnList = "read_at")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_admin_grading_notification_admin_post", columnNames = {"admin_id", "post_id"})
})
public class AdminGradingNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "admin_id", nullable = false)
    private Long adminId;

    @Column(name = "post_id", nullable = false)
    private Long postId;

    @Column(name = "read_at", nullable = true)
    private LocalDateTime readAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected AdminGradingNotification() {}

    public AdminGradingNotification(Long adminId, Long postId) {
        this.adminId = adminId;
        this.postId = postId;
    }

    @PrePersist
    void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    public Long getId() { return id; }
    public Long getAdminId() { return adminId; }
    public Long getPostId() { return postId; }
    public LocalDateTime getReadAt() { return readAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    public void markAsRead() {
        this.readAt = LocalDateTime.now();
    }
}
