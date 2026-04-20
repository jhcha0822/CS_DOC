package com.fasoo.cs_doc.admin.dto;

import java.time.LocalDateTime;

public record PostStatListItem(
        long id,
        String title,
        LocalDateTime createdAt,
        Long categoryId,
        String categoryLabel
) {}
