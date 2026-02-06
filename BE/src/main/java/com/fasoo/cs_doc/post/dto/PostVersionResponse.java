package com.fasoo.cs_doc.post.dto;

import java.time.LocalDateTime;

public record PostVersionResponse(
        Long id,
        Long postId,
        Integer versionNumber,
        String contentMd,
        String createdBy,
        LocalDateTime createdAt
) {
    public static PostVersionResponse from(com.fasoo.cs_doc.post.domain.PostVersion version) {
        return new PostVersionResponse(
                version.getId(),
                version.getPostId(),
                version.getVersionNumber(),
                version.getContentMd(),
                version.getCreatedBy(),
                version.getCreatedAt()
        );
    }
}
