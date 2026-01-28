package com.fasoo.cs_doc.post.dto;

import java.time.LocalDateTime;

public record PostDetailResponse(
        Long id,
        String title,
        String contentMd,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
