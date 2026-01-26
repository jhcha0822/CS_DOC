package com.fasoo.cs_doc.post.dto;

import java.time.LocalDateTime;

public record PostResponse(
        Long id,
        String title,
        String contentMdPath,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}


