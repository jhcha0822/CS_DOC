package com.fasoo.cs_doc.post.dto;

import java.util.List;

public record PostListResponse(
        List<PostListItemResponse> items
) {}
