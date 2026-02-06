package com.fasoo.cs_doc.post.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PostCreateRequest(
        @NotBlank @Size(max = 200) String title,
        @NotNull Long categoryId,
        @NotBlank String contentMd,
        Boolean isNotice
) {}
