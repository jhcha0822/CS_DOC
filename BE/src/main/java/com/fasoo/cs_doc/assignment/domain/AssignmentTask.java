package com.fasoo.cs_doc.assignment.domain;

import jakarta.persistence.*;
import java.util.Objects;

/**
 * 세부 과제. Post(과제) 1건당 N개.
 * 설명은 descriptionMdPath로 md 파일 경로만 저장.
 */
@Entity
@Table(name = "assignment_task", indexes = {
        @Index(name = "idx_assignment_task_post_id", columnList = "post_id")
})
public class AssignmentTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "post_id", nullable = false)
    private Long postId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "description_md_path", nullable = true, length = 500)
    private String descriptionMdPath;

    @Column(name = "max_score", nullable = false)
    private int maxScore = 10;

    protected AssignmentTask() {}

    public AssignmentTask(Long postId, String title, int sortOrder) {
        this.postId = postId;
        this.title = title;
        this.sortOrder = sortOrder;
    }

    public AssignmentTask(Long postId, String title, int sortOrder, int maxScore) {
        this.postId = postId;
        this.title = title;
        this.sortOrder = sortOrder;
        this.maxScore = Math.max(1, Math.min(100, maxScore));
    }

    @PrePersist
    void onCreate() {}

    public Long getId() { return id; }
    public Long getPostId() { return postId; }
    public String getTitle() { return title; }
    public int getSortOrder() { return sortOrder; }
    public String getDescriptionMdPath() { return descriptionMdPath; }
    public int getMaxScore() { return maxScore; }

    public void changeTitle(String title) {
        this.title = Objects.requireNonNull(title, "title").trim();
        if (this.title.isEmpty()) throw new IllegalArgumentException("title must not be blank");
    }

    public void changeSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public void changeDescriptionMdPath(String descriptionMdPath) {
        this.descriptionMdPath = descriptionMdPath;
    }

    public void changeMaxScore(int maxScore) {
        this.maxScore = Math.max(1, Math.min(100, maxScore));
    }
}
