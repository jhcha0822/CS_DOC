package com.fasoo.cs_doc.assignment.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * GET /api/posts/{postId}/assignment-page 응답. 한 페이지에 필요한 모든 데이터.
 * 과제(Post) - 세부 실습(Task) - 제출(Submission) - 평가(Review) 구조.
 */
public record AssignmentPageResponse(
        Long postId,
        String title,
        String summaryTitle,
        Long categoryId,
        String categoryLabel,
        Long createdBy,
        String createdByName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime dueAt,
        Integer maxScore,
        String problemMarkdown,
        String postAttachments, // 실습 등록 시 첨부파일 JSON
        List<TaskItem> tasks, // 세부 실습 목록
        MySubmissionItem mySubmission,
        List<SubmissionItem> allSubmissions
) {
    /** 세부 실습 1건: 내용(MD) + 배점 + 난이도(상/중/하) */
    public record TaskItem(
            Long taskId,
            String title,
            String descriptionMarkdown,
            int sortOrder,
            int maxScore,
            String difficulty // HIGH(상), MEDIUM(중), LOW(하)
    ) {}

    /** 세부 실습별 답안 1건 */
    public record TaskAnswerItem(Long taskId, String answerMarkdown) {}

    /**
     * 현재 사용자의 답변.
     * tasks가 있으면 taskAnswers 사용(세부 실습별), 없으면 answerMarkdown만 사용.
     */
    public record MySubmissionItem(
            Long submissionId,
            String status, // DRAFT | SUBMITTED | GRADED
            String answerMarkdown, // 통합 답변 (tasks 없을 때만 사용)
            List<TaskAnswerItem> taskAnswers, // 세부 실습별 답변 (tasks 있을 때)
            String attachments, // JSON 배열 [{"url":"...","name":"..."}]
            LocalDateTime submittedAt,
            LocalDateTime gradedAt,
            ReviewItem review // 평가 (있으면)
    ) {}

    /**
     * 사용자 요약 (피평가자/평가자 표시용). Member 엔티티에 있는 필드만 사용.
     */
    public record MemberSummary(
            Long memberId,
            String username,
            String name
    ) {}

    /**
     * 모든 답변 목록 (관리자/작성자용)
     * @param submitterName deprecated — UI 표시는 submitterSummary.name 사용 권장
     */
    public record SubmissionItem(
            Long submissionId,
            Long submitterId,
            String submitterName, // @deprecated submitterSummary.name 사용 권장
            MemberSummary submitterSummary,
            String status,
            String answerMarkdown,
            List<TaskAnswerItem> taskAnswers, // 세부 실습별 답변 (tasks 있을 때)
            String attachments, // JSON 배열 [{"url":"...","name":"..."}]
            LocalDateTime submittedAt,
            LocalDateTime gradedAt,
            ReviewItem review
    ) {}

    /** 세부 실습별 평가 1건 */
    public record TaskReviewItem(
            Long taskId,
            Integer score,
            int maxScore,
            String feedbackText
    ) {}

    /**
     * 평가 정보
     * @param reviewerName deprecated — UI 표시는 reviewerSummary.name 사용 권장
     * @param taskReviews 세부 실습별 평가 (있으면 태스크별 점수/피드백)
     */
    public record ReviewItem(
            Integer score,
            String feedbackText,
            Long reviewerId,
            String reviewerName, // @deprecated reviewerSummary.name 사용 권장
            MemberSummary reviewerSummary, // 평가자 표시용
            LocalDateTime reviewedAt,
            List<TaskReviewItem> taskReviews // 세부 실습별 평가 (없으면 null)
    ) {}
}
