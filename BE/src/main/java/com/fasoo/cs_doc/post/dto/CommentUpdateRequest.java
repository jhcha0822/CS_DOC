package com.fasoo.cs_doc.post.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CommentUpdateRequest(
        @NotBlank(message = "댓글 내용은 필수입니다.")
        @Size(max = 5000, message = "댓글 내용은 5000자 이하여야 합니다.")
        String content,
        
        Long userId // 수정자 사용자 ID (선택적)
) {}
