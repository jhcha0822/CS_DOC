package com.fasoo.cs_doc.assignment.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * 답변별 관리자 평가. submission당 1건 (1:1).
 */
@Entity
@Table(name = "assignment_review", indexes = {
        @Index(name = "idx_assignment_review_submission_id", columnList = "submission_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_assignment_review_submission", columnNames = {"submission_id"})
})
public class AssignmentReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "submission_id", nullable = false, unique = true)
    private Long submissionId;

    @Column(name = "reviewer_id", nullable = true)
    private Long reviewerId;

    @Column(nullable = false)
    private int score;

    @Column(name = "feedback_text", nullable = true, length = 2000)
    private String feedbackText;

    @Column(name = "reviewed_at", nullable = false)
    private LocalDateTime reviewedAt;

    protected AssignmentReview() {}

    public AssignmentReview(Long submissionId, int score, String feedbackText, Long reviewerId) {
        this.submissionId = submissionId;
        this.score = score;
        this.feedbackText = feedbackText;
        this.reviewerId = reviewerId;
        this.reviewedAt = LocalDateTime.now();
    }

    @PrePersist
    void onCreate() {
        if (reviewedAt == null) reviewedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public Long getSubmissionId() { return submissionId; }
    public Long getReviewerId() { return reviewerId; }
    public int getScore() { return score; }
    public String getFeedbackText() { return feedbackText; }
    public LocalDateTime getReviewedAt() { return reviewedAt; }

    public void setScore(int score) {
        this.score = score;
    }

    public void setFeedbackText(String feedbackText) {
        this.feedbackText = feedbackText;
    }

    public void setReviewerId(Long reviewerId) {
        this.reviewerId = reviewerId;
    }
}
