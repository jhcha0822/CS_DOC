package com.fasoo.cs_doc.assignment.dto;

import jakarta.validation.constraints.Size;

/** 세부 실습 1건 (게시글 생성/수정 요청용). taskId는 수정 시에만 사용. difficulty: HIGH(상), MEDIUM(중), LOW(하) */
public record AssignmentTaskItemRequest(
        Long taskId,
        @Size(max = 200) String title,
        String descriptionMarkdown,
        int sortOrder,
        int maxScore,
        String difficulty // HIGH | MEDIUM | LOW, null이면 MEDIUM
) {}
