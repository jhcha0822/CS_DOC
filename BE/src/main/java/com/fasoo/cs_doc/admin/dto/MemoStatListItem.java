package com.fasoo.cs_doc.admin.dto;

import java.time.LocalDateTime;

/**
 * 통계 화면용 메모 한 줄(활성 또는 삭제 보관본).
 */
public record MemoStatListItem(
        String listKey,
        long sourceMemoId,
        String title,
        LocalDateTime createdAt,
        boolean deleted,
        LocalDateTime deletedAt,
        String deletionReason
) {}
