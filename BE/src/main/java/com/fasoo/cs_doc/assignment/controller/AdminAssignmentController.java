package com.fasoo.cs_doc.assignment.controller;

import com.fasoo.cs_doc.assignment.dto.AdminAssignmentGradesDto;
import com.fasoo.cs_doc.assignment.dto.AssignmentRequestResponse;
import com.fasoo.cs_doc.assignment.dto.CreateAssignmentRequestsRequest;
import com.fasoo.cs_doc.assignment.dto.GradingNotificationItem;
import com.fasoo.cs_doc.assignment.dto.TaskReviewRequest;
import com.fasoo.cs_doc.assignment.service.AssignmentRequestService;
import com.fasoo.cs_doc.assignment.service.AssignmentService;
import com.fasoo.cs_doc.assignment.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "http://localhost:5173")
@Tag(name = "Admin Assignment", description = "관리자 평가")
@RestController
@RequestMapping("/api/admin")
public class AdminAssignmentController {

    private final AssignmentService assignmentService;
    private final AssignmentRequestService assignmentRequestService;
    private final NotificationService notificationService;

    public AdminAssignmentController(AssignmentService assignmentService,
                                     AssignmentRequestService assignmentRequestService,
                                     NotificationService notificationService) {
        this.assignmentService = assignmentService;
        this.assignmentRequestService = assignmentRequestService;
        this.notificationService = notificationService;
    }

    @Operation(summary = "실습 채점 조회: 전체 실습 목록 + 실습별/사용자별 필터 시 점수 목록")
    @GetMapping("/assignment-grades")
    public ResponseEntity<AdminAssignmentGradesDto> getAssignmentGrades(
            @RequestParam(required = false) Long assignmentId,
            @RequestParam(required = false) Long userId
    ) {
        return ResponseEntity.ok(assignmentService.getAdminAssignmentGrades(assignmentId, userId));
    }

    @Operation(summary = "Save review (score + feedback) - 새 구조: submissionId 기준. taskScores 있으면 세부 실습별 평가")
    @PutMapping("/submissions/{submissionId}/review")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void saveReview(
            @PathVariable Long submissionId,
            @RequestBody @Valid TaskReviewRequest req,
            @RequestHeader(value = "X-User-Id", required = false) Long reviewerId
    ) {
        if (req.taskScores() != null && !req.taskScores().isEmpty()) {
            assignmentService.saveReviewWithTaskScores(submissionId, req.taskScores(), reviewerId);
        } else {
            int score = req.score() != null ? req.score() : 0;
            assignmentService.saveReview(submissionId, score, req.feedbackText(), reviewerId);
        }
    }

    @Operation(summary = "미확인 '평가 필요' 알림 목록 (모달용)")
    @GetMapping("/grading-notifications/unread")
    public List<GradingNotificationItem> getUnreadGrading(
            @RequestHeader(value = "X-User-Id", required = false) Long adminId
    ) {
        return notificationService.findUnreadGradingByAdminId(adminId);
    }

    @Operation(summary = "평가할 목록 (종 버튼용)")
    @GetMapping("/grading-notifications/todo")
    public List<GradingNotificationItem> getGradingTodo(
            @RequestHeader(value = "X-User-Id", required = false) Long adminId
    ) {
        return notificationService.findGradingTodoByAdminId(adminId);
    }

    @Operation(summary = "모든 '평가 필요' 알림 확인 처리")
    @PatchMapping("/grading-notifications/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAllGradingRead(
            @RequestHeader(value = "X-User-Id", required = false) Long adminId
    ) {
        if (adminId == null) {
            throw new IllegalArgumentException("로그인이 필요합니다.");
        }
        notificationService.markAllGradingReadByAdminId(adminId);
    }

    @Operation(summary = "사용자 지정 실습 결과 작성 요청")
    @PostMapping("/assignment-requests")
    public ResponseEntity<List<AssignmentRequestResponse>> createAssignmentRequests(
            @RequestBody @Valid CreateAssignmentRequestsRequest req,
            @RequestHeader(value = "X-User-Id", required = false) Long adminUserId
    ) {
        if (adminUserId == null) {
            throw new IllegalArgumentException("로그인이 필요합니다.");
        }
        List<AssignmentRequestResponse> created = assignmentRequestService.createRequests(req, adminUserId);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
