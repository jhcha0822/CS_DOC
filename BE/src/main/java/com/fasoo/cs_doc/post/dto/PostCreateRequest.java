package com.fasoo.cs_doc.post.dto;

import com.fasoo.cs_doc.post.domain.PostCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PostCreateRequest(
        @NotBlank @Size(max = 200) String title,
        PostCategory category,
        @NotBlank String contentMd
) {}
