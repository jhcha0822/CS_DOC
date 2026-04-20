package com.fasoo.cs_doc.admin.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * 관리자용: 카테고리별 게시글 수(기간 필터 선택) + 메모 수
 */
public record AdminContentStatsResponse(
        long totalPostCount,
        List<CategoryPostCountDto> rows,
        long uncategorizedPostCount,
        long memoCount,
        LocalDate rangeStart,
        LocalDate rangeEnd,
        boolean dateFilterApplied
) {}
