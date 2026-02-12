package com.fasoo.cs_doc.memo.dto;

import java.time.LocalDateTime;

/** 목록/좌측 패널용. 제목·본문 일부·수정일 */
public record MemoListItemResponse(
        Long id,
        String title,
        String bodyPreview,  // 본문 앞부분 일부
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        String updatedByName // 최종 수정자 이름
) {}
