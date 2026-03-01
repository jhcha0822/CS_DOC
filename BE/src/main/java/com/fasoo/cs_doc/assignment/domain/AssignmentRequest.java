package com.fasoo.cs_doc.assignment.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * 관리자가 특정 사용자에게 실습 결과 작성 요청을 보낸 기록.
 * 사용자는 로그인/새로고침 시 미확인 요청이 있으면 모달로 확인할 수 있음.
 */
@Entity
@Table(name = "assignment_request", indexes = {
        @Index(name = "idx_assignment_request_user_id", columnList = "user_id"),
        @Index(name = "idx_assignment_request_read_at", columnList = "read_at")
})
public class AssignmentRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 실습(과제) 게시글 ID */
    @Column(name = "post_id", nullable = false)
    private Long postId;

    /** 요청 대상 사용자 ID */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 요청한 관리자 ID */
    @Column(name = "requested_by", nullable = false)
    private Long requestedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** 사용자가 확인한 시각 (null이면 미확인 → 모달 표시 대상) */
    @Column(name = "read_at", nullable = true)
    private LocalDateTime readAt;

    protected AssignmentRequest() {}

    public AssignmentRequest(Long postId, Long userId, Long requestedBy) {
        this.postId = postId;
        this.userId = userId;
        this.requestedBy = requestedBy;
    }

    @PrePersist
    void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    public Long getId() { return id; }
    public Long getPostId() { return postId; }
    public Long getUserId() { return userId; }
    public Long getRequestedBy() { return requestedBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getReadAt() { return readAt; }

    public void markAsRead() {
        this.readAt = LocalDateTime.now();
    }
}
