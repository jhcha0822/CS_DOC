package com.fasoo.cs_doc.post.dto;

import com.fasoo.cs_doc.post.domain.PostCategory;

import java.time.LocalDateTime;

public record PostListItemResponse(
        Long id,
        String title,
        PostCategory category, // Deprecated: 기존 데이터 호환성을 위해 유지
        Long categoryId,
        Boolean isNotice,
        Long viewCount,
        String attachments, // JSON array of attachment URLs
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
