package com.fasoo.cs_doc.post.dto;

import com.fasoo.cs_doc.post.domain.PostCategory;
import com.fasoo.cs_doc.post.domain.PostKind;

import java.time.LocalDateTime;
import java.util.List;

public record PostDetailResponse(
        Long id,
        String title,
        String summaryTitle,
        PostCategory category,
        Long categoryId,
        Boolean isNotice,
        String contentMd,
        Long viewCount,
        String attachments,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        String createdByName,
        String updatedByName,
        Integer versionNumber,
        PostKind postKind,
        Integer maxScore,
        List<AssignmentTaskDetail> assignmentTasks // 세부 실습 목록 (ASSIGNMENT인 경우)
) {
    /** 세부 실습 1건 (수정 폼용). difficulty: HIGH(상), MEDIUM(중), LOW(하) */
    public record AssignmentTaskDetail(
            Long taskId,
            String title,
            String descriptionMarkdown,
            int sortOrder,
            int maxScore,
            String difficulty
    ) {}
}
