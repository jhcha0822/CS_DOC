package com.fasoo.cs_doc.admin.dto;

import java.util.List;

public record CategoryPostCountDto(
        long categoryId,
        Long parentId,
        int depth,
        String label,
        long postCount,
        /** 목록 팝업 조회 시 categoryId IN (…) 로 사용 */
        List<Long> postFilterCategoryIds
) {}
