package com.fasoo.cs_doc.post.dto;

import com.fasoo.cs_doc.post.domain.PostCategory;

public record PostPatchRequest(
        String title,
        PostCategory category,
        String markdown
) {}