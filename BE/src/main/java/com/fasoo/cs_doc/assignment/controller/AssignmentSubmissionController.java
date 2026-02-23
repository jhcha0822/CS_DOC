package com.fasoo.cs_doc.assignment.controller;

import com.fasoo.cs_doc.assignment.domain.AssignmentSubmission;
import com.fasoo.cs_doc.assignment.dto.TaskContentRequest;
import com.fasoo.cs_doc.assignment.service.AssignmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.List;

@CrossOrigin(origins = "http://localhost:5173")
@Tag(name = "Assignment Submissions", description = "사용자 제출 (내 제출 생성, 답안 저장, 최종 제출)")
@RestController
public class AssignmentSubmissionController {

    private final AssignmentService assignmentService;

    public AssignmentSubmissionController(AssignmentService assignmentService) {
        this.assignmentService = assignmentService;
    }

    @Operation(summary = "Get or create my submission")
    @PostMapping("/api/posts/{postId}/submissions/me")
    @ResponseStatus(HttpStatus.CREATED)
    public AssignmentSubmission getOrCreateMySubmission(
            @PathVariable Long postId,
            @RequestHeader("X-User-Id") Long userId
    ) {
        return assignmentService.getOrCreateMySubmission(postId, userId);
    }

    @Operation(summary = "Save answer (draft) - 새 구조: task 제거, submission 단위로 답변 저장")
    @PutMapping("/api/submissions/{submissionId}/answer")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void putAnswer(
            @PathVariable Long submissionId,
            @RequestBody(required = false) TaskContentRequest req,
            @RequestHeader("X-User-Id") Long userId
    ) {
        assignmentService.putSubmissionAnswer(submissionId, userId, req != null ? req.taskId() : null, req != null ? req.markdown() : "");
    }

    @Operation(summary = "Submit (final)")
    @PostMapping("/api/submissions/{submissionId}/submit")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void submit(
            @PathVariable Long submissionId,
            @RequestHeader("X-User-Id") Long userId
    ) {
        assignmentService.submit(submissionId, userId);
    }

    @Operation(summary = "Add attachments to submission")
    @PostMapping(value = "/api/submissions/{submissionId}/attachments", consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void addAttachments(
            @PathVariable Long submissionId,
            @RequestParam(value = "attachments", required = false) MultipartFile[] attachments,
            @RequestHeader("X-User-Id") Long userId
    ) {
        List<MultipartFile> list = attachments != null
                ? Arrays.stream(attachments).filter(f -> f != null && !f.isEmpty()).toList()
                : List.of();
        assignmentService.addAttachmentsToSubmission(submissionId, userId, list);
    }
}
