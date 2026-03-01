package com.fasoo.cs_doc.assignment.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CreateAssignmentRequestsRequest(
        @NotNull Long postId,
        @NotEmpty List<Long> userIds
) {}
