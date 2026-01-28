package com.fasoo.cs_doc.post.dto;

import java.time.LocalDateTime;

public record PostListItemResponse(
        Long id,
        String title,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
