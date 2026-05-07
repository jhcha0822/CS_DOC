package com.fasoo.cs_doc.admin.dto;

import java.util.List;

public record CategoryPostCountDto(
        long categoryId,
        Long parentId,
        int depth,
        String label,
        /** 현재 비삭제 게시글 수(누계) */
        long postCount,
        /** 기간 내 신규 등록(생성일). 기간 미선택 시 null */
        Long createdInPeriod,
        /** 기간 내 소프트 삭제(updatedAt 근사). 기간 미선택 시 null */
        Long deletedInPeriod,
        /** 기간 순증감(증가−감소, 음수 가능). 기간 미선택 시 null */
        Long netChangeInPeriod,
        /** 목록 팝업 조회 시 categoryId IN (…) 로 사용 */
        List<Long> postFilterCategoryIds
) {}
