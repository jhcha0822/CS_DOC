package com.fasoo.cs_doc.post.dto;

import java.time.LocalDateTime;

public record PostVersionResponse(
        Long id,
        Long postId,
        Integer versionNumber,
        String title,
        String contentMd,
        String createdBy,
        LocalDateTime createdAt
) {}
