package com.fasoo.cs_doc.admin.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * 관리자용: 카테고리별 게시글 수(기간 필터 선택) + 메모 누계·기간별 증감
 */
public record AdminContentStatsResponse(
        /** 현재 비삭제 게시글 전체 수(누계) */
        long totalPostCount,
        /** 기간 내 전체 신규(생성일). 기간 미선택 시 null */
        Long totalCreatedInPeriod,
        /** 기간 내 전체 소프트 삭제(updatedAt 근사). 기간 미선택 시 null */
        Long totalDeletedInPeriod,
        /** 기간 전체 순증감(증가−감소). 기간 미선택 시 null */
        Long totalNetChangeInPeriod,
        List<CategoryPostCountDto> rows,
        /** 카테고리 미지정·비삭제 누계 */
        long uncategorizedPostCount,
        Long uncategorizedCreatedInPeriod,
        Long uncategorizedDeletedInPeriod,
        Long uncategorizedNetChangeInPeriod,
        /** 현재 memo 테이블에 남아 있는 메모 수(누계) */
        long memoCumulativeCount,
        /** 기간 내 신규(생성일). 기간 미선택 시 null */
        Long memoCreatedInPeriod,
        /** 기간 내 삭제 보관(deleted_memo.deleted_at). 기간 미선택 시 null */
        Long memoDeletedInPeriod,
        /** 기간 내 순증감(증가−감소). 기간 미선택 시 null */
        Long memoNetChangeInPeriod,
        LocalDate rangeStart,
        LocalDate rangeEnd,
        boolean dateFilterApplied
) {}
