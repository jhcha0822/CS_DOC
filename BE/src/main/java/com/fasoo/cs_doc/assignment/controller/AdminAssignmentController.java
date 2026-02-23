package com.fasoo.cs_doc.assignment.controller;

import com.fasoo.cs_doc.assignment.dto.TaskReviewRequest;
import com.fasoo.cs_doc.assignment.service.AssignmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "http://localhost:5173")
@Tag(name = "Admin Assignment", description = "관리자 평가")
@RestController
@RequestMapping("/api/admin")
public class AdminAssignmentController {

    private final AssignmentService assignmentService;

    public AdminAssignmentController(AssignmentService assignmentService) {
        this.assignmentService = assignmentService;
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
}
