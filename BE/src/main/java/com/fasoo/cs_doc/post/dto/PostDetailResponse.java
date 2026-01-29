package com.fasoo.cs_doc.post.dto;

import com.fasoo.cs_doc.post.domain.PostCategory;

import java.time.LocalDateTime;

public record PostDetailResponse(
        Long id,
        String title,
        PostCategory category,
        String contentMd,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
