package com.fasoo.cs_doc.post.dto;

public record PostPatchRequest(
        String title,
        Long categoryId,
        String markdown,
        Boolean isNotice,
        Long userId // 수정자 사용자 ID (선택적)
) {}