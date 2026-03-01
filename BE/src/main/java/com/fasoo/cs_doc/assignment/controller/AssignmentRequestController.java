package com.fasoo.cs_doc.assignment.controller;

import com.fasoo.cs_doc.assignment.dto.AssignmentRequestResponse;
import com.fasoo.cs_doc.assignment.dto.GradedNotificationItem;
import com.fasoo.cs_doc.assignment.service.AssignmentRequestService;
import com.fasoo.cs_doc.assignment.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "http://localhost:5173")
@Tag(name = "Assignment Requests", description = "실습 결과 작성 요청 (사용자 알림)")
@RestController
@RequestMapping("/api/assignment-requests")
public class AssignmentRequestController {

    private final AssignmentRequestService assignmentRequestService;
    private final NotificationService notificationService;

    public AssignmentRequestController(AssignmentRequestService assignmentRequestService,
                                       NotificationService notificationService) {
        this.assignmentRequestService = assignmentRequestService;
        this.notificationService = notificationService;
    }

    @Operation(summary = "내 미확인 실습 요청 목록 (페이지 이동 시 모달용, 미제출만)")
    @GetMapping("/me/unread")
    public List<AssignmentRequestResponse> getMyUnread(
            @RequestHeader(value = "X-User-Id", required = false) Long userId
    ) {
        if (userId == null) {
            return List.of();
        }
        return assignmentRequestService.findUnreadByUserId(userId);
    }

    @Operation(summary = "할 일 실습 목록 (종 버튼용, 미제출 요청만)")
    @GetMapping("/me/todo")
    public List<AssignmentRequestResponse> getMyTodo(
            @RequestHeader(value = "X-User-Id", required = false) Long userId
    ) {
        if (userId == null) {
            return List.of();
        }
        return assignmentRequestService.findTodoByUserId(userId);
    }

    @Operation(summary = "미확인 '평가 완료된 실습' 알림 목록")
    @GetMapping("/me/graded-unread")
    public List<GradedNotificationItem> getMyGradedUnread(
            @RequestHeader(value = "X-User-Id", required = false) Long userId
    ) {
        if (userId == null) return List.of();
        return notificationService.findUnreadGradedByUserId(userId);
    }

    @Operation(summary = "요청 확인 처리 (모달에서 확인 클릭 시)")
    @PatchMapping("/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAsRead(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", required = false) Long userId
    ) {
        if (userId == null) {
            throw new IllegalArgumentException("로그인이 필요합니다.");
        }
        assignmentRequestService.markAsRead(id, userId);
    }

    @Operation(summary = "'평가 완료' 알림 확인 처리")
    @PatchMapping("/graded/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markGradedAsRead(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", required = false) Long userId
    ) {
        if (userId == null) {
            throw new IllegalArgumentException("로그인이 필요합니다.");
        }
        notificationService.markGradedNotificationRead(id, userId);
    }
}
