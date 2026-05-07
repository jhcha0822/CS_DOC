package com.fasoo.cs_doc.memo.dto;

import jakarta.validation.constraints.NotBlank;

public record MemoDeleteRequest(
        @NotBlank(message = "삭제 사유를 입력해 주세요.")
        String deletionReason
) {}
