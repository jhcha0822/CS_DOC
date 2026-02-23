package com.fasoo.cs_doc.assignment.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * 세부 과제별 사용자 답변. 답변 본문은 answerMdPath(md 파일)로만 저장.
 */
@Entity
@Table(name = "assignment_task_submission", indexes = {
        @Index(name = "idx_task_submission_submission_id", columnList = "submission_id"),
        @Index(name = "idx_task_submission_task_id", columnList = "task_id")
})
public class AssignmentTaskSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "submission_id", nullable = false)
    private Long submissionId;

    @Column(name = "task_id", nullable = false)
    private Long taskId;

    @Column(name = "answer_md_path", nullable = true, length = 500)
    private String answerMdPath;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected AssignmentTaskSubmission() {}

    public AssignmentTaskSubmission(Long submissionId, Long taskId) {
        this.submissionId = submissionId;
        this.taskId = taskId;
        this.updatedAt = LocalDateTime.now();
    }

    @PrePersist
    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public Long getSubmissionId() { return submissionId; }
    public Long getTaskId() { return taskId; }
    public String getAnswerMdPath() { return answerMdPath; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public void setAnswerMdPath(String answerMdPath) {
        this.answerMdPath = answerMdPath;
    }
}
