package com.fasoo.cs_doc.post.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * 게시글 버전 관리 엔티티
 * 게시글 내용이 변경될 때마다 새로운 버전이 생성되어 저장됩니다.
 * 추후 사용자 정보(createdBy)를 추가할 수 있도록 설계되었습니다.
 */
@Entity
@Table(
        name = "post_version",
        indexes = {
                @Index(name = "idx_post_version_post_id", columnList = "postId"),
                @Index(name = "idx_post_version_created_at", columnList = "createdAt")
        }
)
public class PostVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "post_id", nullable = false)
    private Long postId;

    /**
     * 버전 번호 (1부터 시작, 같은 게시글 내에서 순차적으로 증가)
     */
    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    /**
     * 해당 버전의 마크다운 내용
     */
    @Column(name = "content_md", nullable = false, columnDefinition = "CLOB")
    private String contentMd;

    /**
     * 변경을 일으킨 사용자 정보 (추후 확장)
     * 현재는 null이지만, 사용자 인증 시스템이 추가되면 사용자 ID를 저장할 수 있습니다.
     */
    @Column(name = "created_by", nullable = true, length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected PostVersion() {}

    public PostVersion(Long postId, Integer versionNumber, String contentMd) {
        this.postId = postId;
        this.versionNumber = versionNumber;
        this.contentMd = contentMd;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public Long getPostId() { return postId; }
    public Integer getVersionNumber() { return versionNumber; }
    public String getContentMd() { return contentMd; }
    public String getCreatedBy() { return createdBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }
}
