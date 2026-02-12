package com.fasoo.cs_doc.post.dto;

import java.time.LocalDateTime;

public record PostVersionResponse(
        Long id,
        Long postId,
        Integer versionNumber,
        String title,
        String contentMd,
        Long createdBy, // 사용자 ID
        String createdByName, // 사용자 이름
        LocalDateTime createdAt
) {}
