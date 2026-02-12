package com.fasoo.cs_doc.memo.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * 메모 생성 요청. 본문·제목 + 이미지 URL JSON(선택, 최대 10개).
 */
public record MemoCreateRequest(
        @NotBlank(message = "title is required")
        String title,
        String body,
        String images,  // JSON array [{"url":"...","name":"..."}], max 10
        Long userId  // 작성자 사용자 ID
) {}
