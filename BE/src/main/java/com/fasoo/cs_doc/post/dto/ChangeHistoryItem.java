package com.fasoo.cs_doc.post.dto;

import java.time.LocalDateTime;

/**
 * 변경 이력 항목 DTO
 * 게시글의 생성, 수정, 삭제 이력을 통합하여 표시하기 위한 DTO
 */
public record ChangeHistoryItem(
        Long postId,
        String postTitle,
        String category,
        Long categoryId,
        String changeType, // "생성", "수정", "삭제"
        LocalDateTime changeDate,
        String changedBy, // 사용자 이름
        Integer versionNumber,
        String attachments // 첨부파일 정보
) {
    public static ChangeHistoryItem create(PostListItemResponse post, Integer versionNumber, LocalDateTime createdAt, String versionTitle, String changedByName) {
        String title = post.title(); // 목록에는 현 제목 표기 (글 ID로 동일 글 판단)
        return new ChangeHistoryItem(
                post.id(),
                title,
                post.category() != null ? post.category().name() : null,
                post.categoryId(),
                "생성",
                createdAt,
                changedByName,
                versionNumber,
                post.attachments()
        );
    }

    public static ChangeHistoryItem update(PostListItemResponse post, Integer versionNumber, LocalDateTime createdAt, String versionTitle, String changedByName) {
        String title = post.title(); // 목록에는 현 제목 표기 (글 ID로 동일 글 판단)
        return new ChangeHistoryItem(
                post.id(),
                title,
                post.category() != null ? post.category().name() : null,
                post.categoryId(),
                "수정",
                createdAt,
                changedByName,
                versionNumber,
                post.attachments()
        );
    }

    public static ChangeHistoryItem delete(PostListItemResponse post, String changedByName) {
        return new ChangeHistoryItem(
                post.id(),
                post.title(),
                post.category() != null ? post.category().name() : null,
                post.categoryId(),
                "삭제",
                post.updatedAt(), // 삭제 시점
                changedByName,
                null,
                post.attachments()
        );
    }
}
