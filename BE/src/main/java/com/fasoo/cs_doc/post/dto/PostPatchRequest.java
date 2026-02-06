package com.fasoo.cs_doc.post.dto;

public record PostPatchRequest(
        String title,
        Long categoryId,
        String markdown,
        Boolean isNotice
) {}