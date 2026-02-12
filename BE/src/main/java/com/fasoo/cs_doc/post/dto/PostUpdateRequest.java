package com.fasoo.cs_doc.post.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PostUpdateRequest(
        @NotBlank @Size(max = 200) String title,
        @NotBlank String contentMd,
        Long userId // 수정자 사용자 ID (선택적)
) {}
