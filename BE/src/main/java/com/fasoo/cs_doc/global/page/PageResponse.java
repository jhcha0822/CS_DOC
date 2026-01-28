package com.fasoo.cs_doc.global.page;

import java.util.List;

public record PageResponse<T>(
        List<T> items,
        int page,          // 0-based
        int size,
        long totalElements,
        int totalPages,
        boolean hasNext,
        boolean hasPrevious
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
        return new PageResponse<>(items, page, size, totalElements, totalPages, hasNext, hasPrevious);
    }
}
