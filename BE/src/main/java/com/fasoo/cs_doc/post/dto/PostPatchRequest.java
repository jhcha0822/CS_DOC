package com.fasoo.cs_doc.post.dto;

public record PostPatchRequest(
        String title,
        String markdown
) {}