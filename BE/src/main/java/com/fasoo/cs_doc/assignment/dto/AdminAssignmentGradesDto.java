package com.fasoo.cs_doc.assignment.dto;

import java.util.List;

/** 관리자 실습 채점 조회용 DTO */
public record AdminAssignmentGradesDto(
        List<AssignmentSummary> assignments,
        List<SubmissionGradeRow> byAssignment,  // assignmentId 필터 시: 해당 실습별 사용자 점수 목록
        List<UserSubmissionRow> byUser,         // userId 필터 시: 해당 사용자별 실습 제출 목록
        List<AllSubmissionRow> allSubmissions  // assignmentId·userId 미선택 시: 전체 실습 제출 목록
) {
    /** 실습(과제) 요약 - 목록/필터용 */
    public record AssignmentSummary(
            Long postId,
            String title,
            Integer maxScore,
            List<TaskSummary> tasks
    ) {}

    /** 세부 실습 요약 (난이도 포함) */
    public record TaskSummary(
            Long taskId,
            String title,
            String difficulty,  // HIGH(상), MEDIUM(중), LOW(하)
            int maxScore
    ) {}

    /** 실습별 제출 점수 행 (실습 선택 시: 사용자별 점수) */
    public record SubmissionGradeRow(
            Long submissionId,
            Long submitterId,
            String submitterName,
            String status,
            Integer totalScore,
            Integer maxScore,
            List<TaskScoreCell> taskScores
    ) {}

    /** 사용자별 제출 행 (사용자 선택 시: 실습별 점수) */
    public record UserSubmissionRow(
            Long postId,
            String postTitle,
            Long submissionId,
            String status,
            Integer totalScore,
            Integer maxScore,
            List<TaskScoreCell> taskScores
    ) {}

    /** 전체 제출 행 (실습·사용자 미선택 시: 모든 실습의 제출 목록) */
    public record AllSubmissionRow(
            Long postId,
            String postTitle,
            Long submissionId,
            Long submitterId,
            String submitterName,
            String status,
            Integer totalScore,
            Integer maxScore,
            List<TaskScoreCell> taskScores
    ) {}

    /** 세부 실습 점수 셀 */
    public record TaskScoreCell(
            Long taskId,
            String taskTitle,
            String difficulty,
            Integer score,
            int maxScore
    ) {}
}
