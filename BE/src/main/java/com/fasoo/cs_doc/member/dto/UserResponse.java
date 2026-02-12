package com.fasoo.cs_doc.member.dto;

import com.fasoo.cs_doc.member.domain.UserRole;

public record UserResponse(
        Long id,
        String username,
        String name,
        UserRole role
) {
}
