package com.fasoo.cs_doc.post.dto;

import com.fasoo.cs_doc.assignment.dto.AssignmentTaskItemRequest;
import com.fasoo.cs_doc.post.domain.PostKind;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record PostCreateRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 200) String summaryTitle,
        @NotNull Long categoryId,
        @NotBlank String contentMd,
        Boolean isNotice,
        PostKind postKind,
        Integer maxScore,
        Long userId,
        List<AssignmentTaskItemRequest> tasks // 세부 실습 (ASSIGNMENT인 경우)
) {}
