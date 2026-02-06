package com.fasoo.cs_doc.category.dto;

import java.util.Map;

public record CategoryResponse(
        Long id,
        String code,
        String label,
        Long parentId,
        String parentLabel,
        int depth,
        int sortOrder
) {

    public static CategoryResponse from(com.fasoo.cs_doc.category.domain.Category c, Map<Long, String> parentLabels) {
        if (c == null) {
            throw new IllegalArgumentException("Category cannot be null");
        }
        Long parentId = c.getParentId();
        String parentLabel = null;
        if (parentId != null && parentLabels != null) {
            parentLabel = parentLabels.get(parentId);
        }
        return new CategoryResponse(
                c.getId(),
                c.getCode(),
                c.getLabel(),
                parentId,
                parentLabel,
                c.getDepth(),
                c.getSortOrder()
        );
    }
}
