package com.fasoo.cs_doc.post.dto;

import java.time.LocalDateTime;

public record CommentResponse(
        Long id,
        Long postId,
        String content,
        Long createdBy,
        String createdByName,
        Long updatedBy,
        String updatedByName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
