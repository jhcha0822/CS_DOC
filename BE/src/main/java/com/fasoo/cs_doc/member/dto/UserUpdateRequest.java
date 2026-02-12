package com.fasoo.cs_doc.member.dto;

import jakarta.validation.constraints.NotNull;
import com.fasoo.cs_doc.member.domain.UserRole;

public record UserUpdateRequest(
        String password, // null이면 비밀번호 변경 안 함
        String name, // null이면 이름 변경 안 함
        @NotNull(message = "권한은 필수입니다.")
        UserRole role
) {
}
