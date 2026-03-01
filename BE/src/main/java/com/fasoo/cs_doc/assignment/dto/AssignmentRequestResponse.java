package com.fasoo.cs_doc.assignment.dto;

import java.time.LocalDateTime;

public record AssignmentRequestResponse(
        Long id,
        Long postId,
        String postTitle,
        Long requestedBy,
        String requestedByName,
        LocalDateTime createdAt,
        LocalDateTime readAt
) {}
