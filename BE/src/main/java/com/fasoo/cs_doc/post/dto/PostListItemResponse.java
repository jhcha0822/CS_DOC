package com.fasoo.cs_doc.post.dto;

import com.fasoo.cs_doc.post.domain.PostCategory;

import java.time.LocalDateTime;

public record PostListItemResponse(
        Long id,
        String title,
        PostCategory category,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
