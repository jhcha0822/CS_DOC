package com.fasoo.cs_doc.category.dto;

import jakarta.validation.constraints.Size;

public record CategoryUpdateRequest(
        @Size(max = 100) String label,
        Long parentId
) {}
