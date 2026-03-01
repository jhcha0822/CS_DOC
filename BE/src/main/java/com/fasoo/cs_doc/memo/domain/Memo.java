package com.fasoo.cs_doc.memo.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * 가벼운 팁/메모. post와 별도 테이블로 운영.
 * 본문은 TEXT, 이미지는 최대 10개(JSON) 저장.
 */
@Entity
@Table(
        name = "memo",
        indexes = {
                @Index(name = "idx_memo_updated_at", columnList = "updatedAt"),
                @Index(name = "idx_memo_title_body", columnList = "title")
        }
)
public class Memo {

    private static final int TITLE_MAX_LENGTH = 500;
    /** 이미지 JSON 배열 저장용 (URL + name 등, 10개 이내) */
    private static final int IMAGES_JSON_MAX_LENGTH = 4000;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = TITLE_MAX_LENGTH)
    private String title;

    /** 본문. Plain text (MD 아님). length 10000 → H2: VARCHAR(10000), MSSQL: NVARCHAR(MAX) 등으로 매핑 */
    @Column(nullable = true, length = 10000)
    private String body;

    /** 이미지 URL 목록 JSON. [{"url":"...","name":"..."}] 형식, 최대 10개 */
    @Column(name = "images", nullable = true, length = IMAGES_JSON_MAX_LENGTH)
    private String images;

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

    protected Memo() {}

    public Memo(String title, String body, String images) {
        changeTitle(title);
        this.body = (body == null) ? "" : body;
        this.images = images;
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
    public String getTitle() { return title; }
    public String getBody() { return body; }
    public String getImages() { return images; }
    public Long getCreatedBy() { return createdBy; }
    public Long getUpdatedBy() { return updatedBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public void changeTitle(String title) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("title must not be blank");
        }
        if (title.length() > TITLE_MAX_LENGTH) {
            throw new IllegalArgumentException("title length must be <= " + TITLE_MAX_LENGTH);
        }
        this.title = title.trim();
    }

    public void changeBody(String body) {
        this.body = body == null ? "" : body;
    }

    public void changeImages(String images) {
        if (images != null && images.length() > IMAGES_JSON_MAX_LENGTH) {
            throw new IllegalArgumentException("images json too long");
        }
        this.images = images;
    }

    public void changeCreatedBy(Long createdBy) {
        this.createdBy = createdBy;
    }

    public void changeUpdatedBy(Long updatedBy) {
        this.updatedBy = updatedBy;
    }
}
