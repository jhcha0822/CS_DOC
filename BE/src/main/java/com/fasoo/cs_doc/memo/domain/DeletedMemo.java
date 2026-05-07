package com.fasoo.cs_doc.memo.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * 삭제된 메모 스냅샷(버전 관리 없음). 통계·감사용 보관.
 */
@Entity
@Table(
        name = "deleted_memo",
        indexes = {
                @Index(name = "idx_deleted_memo_deleted_at", columnList = "deleted_at")
        }
)
public class DeletedMemo {

    private static final int TITLE_MAX_LENGTH = 500;
    private static final int IMAGES_JSON_MAX_LENGTH = 4000;
    private static final int REASON_MAX_LENGTH = 2000;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_memo_id", nullable = false)
    private Long sourceMemoId;

    @Column(nullable = false, length = TITLE_MAX_LENGTH)
    private String title;

    @Column(nullable = true, length = 10000)
    private String body;

    @Column(name = "images", nullable = true, length = IMAGES_JSON_MAX_LENGTH)
    private String images;

    @Column(name = "original_created_at", nullable = false)
    private LocalDateTime originalCreatedAt;

    @Column(name = "original_created_by", nullable = true)
    private Long originalCreatedBy;

    @Column(name = "original_updated_by", nullable = true)
    private Long originalUpdatedBy;

    @Column(name = "deleted_at", nullable = false)
    private LocalDateTime deletedAt;

    @Column(name = "deleted_by", nullable = true)
    private Long deletedBy;

    @Column(name = "deletion_reason", nullable = false, length = REASON_MAX_LENGTH)
    private String deletionReason;

    protected DeletedMemo() {}

    public static DeletedMemo archiveFrom(Memo memo, Long deletedBy, String deletionReasonTrimmed, LocalDateTime deletedAt) {
        DeletedMemo d = new DeletedMemo();
        d.sourceMemoId = memo.getId();
        d.title = memo.getTitle();
        d.body = memo.getBody();
        d.images = memo.getImages();
        d.originalCreatedAt = memo.getCreatedAt();
        d.originalCreatedBy = memo.getCreatedBy();
        d.originalUpdatedBy = memo.getUpdatedBy();
        d.deletedAt = deletedAt;
        d.deletedBy = deletedBy;
        if (deletionReasonTrimmed.length() > REASON_MAX_LENGTH) {
            d.deletionReason = deletionReasonTrimmed.substring(0, REASON_MAX_LENGTH);
        } else {
            d.deletionReason = deletionReasonTrimmed;
        }
        return d;
    }

    public Long getId() {
        return id;
    }

    public Long getSourceMemoId() {
        return sourceMemoId;
    }

    public String getTitle() {
        return title;
    }

    public String getBody() {
        return body;
    }

    public String getImages() {
        return images;
    }

    public LocalDateTime getOriginalCreatedAt() {
        return originalCreatedAt;
    }

    public Long getOriginalCreatedBy() {
        return originalCreatedBy;
    }

    public Long getOriginalUpdatedBy() {
        return originalUpdatedBy;
    }

    public LocalDateTime getDeletedAt() {
        return deletedAt;
    }

    public Long getDeletedBy() {
        return deletedBy;
    }

    public String getDeletionReason() {
        return deletionReason;
    }
}
