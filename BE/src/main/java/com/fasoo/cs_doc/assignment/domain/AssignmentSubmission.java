package com.fasoo.cs_doc.assignment.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * 사용자별 과제 제출 1건. (post_id, submitter_id) unique.
 */
@Entity
@Table(name = "assignment_submission", indexes = {
        @Index(name = "idx_assignment_submission_post_id", columnList = "post_id"),
        @Index(name = "idx_assignment_submission_submitter_id", columnList = "submitter_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_assignment_submission_post_submitter", columnNames = {"post_id", "submitter_id"})
})
public class AssignmentSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "post_id", nullable = false)
    private Long postId;

    @Column(name = "submitter_id", nullable = false)
    private Long submitterId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SubmissionStatus status = SubmissionStatus.DRAFT;

    @Column(name = "submitted_at", nullable = true)
    private LocalDateTime submittedAt;

    @Column(name = "graded_at", nullable = true)
    private LocalDateTime gradedAt;

    @Column(name = "total_score", nullable = true)
    private Integer totalScore;

    /**
     * 답변 본문 MD 파일 경로 (루트 기준 상대경로)
     * 예: assignments/{postId}/submissions/{submitterId}/answer.md
     */
    @Column(name = "answer_md_path", nullable = true, length = 500)
    private String answerMdPath;

    /** 답변 첨부파일 JSON [{"url":"...","name":"..."}] */
    @Column(name = "attachments", nullable = true, length = 2000)
    private String attachments;

    protected AssignmentSubmission() {}

    public AssignmentSubmission(Long postId, Long submitterId) {
        this.postId = postId;
        this.submitterId = submitterId;
    }

    public Long getId() { return id; }
    public Long getPostId() { return postId; }
    public Long getSubmitterId() { return submitterId; }
    public SubmissionStatus getStatus() { return status; }
    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public LocalDateTime getGradedAt() { return gradedAt; }
    public Integer getTotalScore() { return totalScore; }
    public String getAnswerMdPath() { return answerMdPath; }
    public String getAttachments() { return attachments; }

    public void setStatus(SubmissionStatus status) {
        this.status = status;
    }

    public void setSubmittedAt(LocalDateTime submittedAt) {
        this.submittedAt = submittedAt;
    }

    public void setGradedAt(LocalDateTime gradedAt) {
        this.gradedAt = gradedAt;
    }

    public void setTotalScore(Integer totalScore) {
        this.totalScore = totalScore;
    }

    public void setAnswerMdPath(String answerMdPath) {
        this.answerMdPath = answerMdPath;
    }

    public void setAttachments(String attachments) {
        this.attachments = attachments;
    }
}
