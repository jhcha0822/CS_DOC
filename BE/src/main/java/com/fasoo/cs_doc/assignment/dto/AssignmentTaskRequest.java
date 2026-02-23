package com.fasoo.cs_doc.assignment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AssignmentTaskRequest(
        @NotBlank @Size(max = 200) String title,
        int sortOrder,
        int maxScore
) {}
