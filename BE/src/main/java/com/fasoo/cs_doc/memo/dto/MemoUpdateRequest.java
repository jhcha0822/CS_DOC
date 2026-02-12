package com.fasoo.cs_doc.memo.dto;

/**
 * 메모 수정 요청.
 */
public record MemoUpdateRequest(
        String title,
        String body,
        String images,  // JSON array, max 10
        Long userId  // 수정자 사용자 ID
) {}
