package com.fasoo.cs_doc.member.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import com.fasoo.cs_doc.member.domain.UserRole;

public record UserCreateRequest(
        @NotBlank(message = "사용자 ID는 필수입니다.")
        String username,

        @NotBlank(message = "비밀번호는 필수입니다.")
        String password,

        @NotBlank(message = "사용자 이름은 필수입니다.")
        String name,

        @NotNull(message = "권한은 필수입니다.")
        UserRole role
) {
}
