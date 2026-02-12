package com.fasoo.cs_doc.memo.dto;

import java.time.LocalDateTime;

public record MemoResponse(
        Long id,
        String title,
        String body,
        String images,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        String updatedByName // 최종 수정자 이름
) {}
