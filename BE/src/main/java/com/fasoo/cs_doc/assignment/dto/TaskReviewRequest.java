package com.fasoo.cs_doc.assignment.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.util.List;

public record TaskReviewRequest(
        @Min(0) @Max(10000) Integer score,
        @Size(max = 2000) String feedbackText,
        List<TaskScoreItem> taskScores
) {}
