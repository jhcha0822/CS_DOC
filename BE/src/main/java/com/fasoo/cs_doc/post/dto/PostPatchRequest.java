package com.fasoo.cs_doc.post.dto;

import com.fasoo.cs_doc.assignment.dto.AssignmentTaskItemRequest;

import java.util.List;

public record PostPatchRequest(
        String title,
        String summaryTitle,
        Long categoryId,
        String markdown,
        Boolean isNotice,
        Integer maxScore,
        Long userId,
        List<AssignmentTaskItemRequest> tasks // 세부 실습 (ASSIGNMENT인 경우)
) {}