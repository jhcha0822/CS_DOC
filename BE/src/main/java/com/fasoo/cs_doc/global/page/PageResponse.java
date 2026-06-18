package com.fasoo.cs_doc.global.page;

import java.util.List;

public record PageResponse<T>(
        List<T> items,
        int page,          // 0-based
        int size,
        long totalElements,
        int totalPages,
        boolean hasNext,
        boolean hasPrevious,
        /** 전체 목록에서 1페이지 상단에 고정 표시되는 공지 개수. 해당 없으면 null */
        Long pinnedNoticeCount
) {
    public static <T> PageResponse<T> of(
            List<T> items,
            int page,
            int size,
            long totalElements,
            int totalPages,
            boolean hasNext,
            boolean hasPrevious
    ) {
        return new PageResponse<>(items, page, size, totalElements, totalPages, hasNext, hasPrevious, null);
    }

    public static <T> PageResponse<T> of(
            List<T> items,
            int page,
            int size,
            long totalElements,
            int totalPages,
            boolean hasNext,
            boolean hasPrevious,
            Long pinnedNoticeCount
    ) {
        return new PageResponse<>(items, page, size, totalElements, totalPages, hasNext, hasPrevious, pinnedNoticeCount);
    }
}
