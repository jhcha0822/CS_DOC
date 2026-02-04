package com.fasoo.cs_doc.category.dto;

/**
 * Bulk update: 여러 카테고리의 parentId, depth, sortOrder를 한 번에 업데이트
 */
public record CategoryBulkUpdateItem(
        Long id,
        String label,
        Long parentId,
        int depth,
        int sortOrder
) {}
