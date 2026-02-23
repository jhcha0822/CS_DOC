package com.fasoo.cs_doc.assignment.dto;

/** 세부 실습별 평가 1건 (평가 저장 요청용) */
public record TaskScoreItem(
        Long taskId,
        int score,
        String feedbackText
) {}
