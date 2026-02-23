package com.fasoo.cs_doc.assignment.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * 세부 과제별 관리자 평가. task_submission당 1건.
 */
@Entity
@Table(name = "assignment_task_review", indexes = {
        @Index(name = "idx_task_review_task_submission_id", columnList = "task_submission_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_assignment_task_review_task_submission", columnNames = {"task_submission_id"})
})
public class AssignmentTaskReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "task_submission_id", nullable = false, unique = true)
    private Long taskSubmissionId;

    @Column(name = "reviewer_id", nullable = true)
    private Long reviewerId;

    @Column(nullable = false)
    private int score;

    @Column(name = "feedback_text", nullable = true, length = 2000)
    private String feedbackText;

    @Column(name = "reviewed_at", nullable = false)
    private LocalDateTime reviewedAt;

    protected AssignmentTaskReview() {}

    public AssignmentTaskReview(Long taskSubmissionId, int score, String feedbackText, Long reviewerId) {
        this.taskSubmissionId = taskSubmissionId;
        this.score = Math.max(0, Math.min(10000, score));
        this.feedbackText = feedbackText;
        this.reviewerId = reviewerId;
        this.reviewedAt = LocalDateTime.now();
    }

    @PrePersist
    void onCreate() {
        if (reviewedAt == null) reviewedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public Long getTaskSubmissionId() { return taskSubmissionId; }
    public Long getReviewerId() { return reviewerId; }
    public int getScore() { return score; }
    public String getFeedbackText() { return feedbackText; }
    public LocalDateTime getReviewedAt() { return reviewedAt; }

    public void setScore(int score) {
        this.score = Math.max(0, Math.min(10000, score));
    }

    public void setFeedbackText(String feedbackText) {
        this.feedbackText = feedbackText;
    }

    public void setReviewerId(Long reviewerId) {
        this.reviewerId = reviewerId;
    }
}
