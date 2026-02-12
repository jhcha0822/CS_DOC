package com.fasoo.cs_doc.post.controller;

import com.fasoo.cs_doc.post.dto.CommentCreateRequest;
import com.fasoo.cs_doc.post.dto.CommentResponse;
import com.fasoo.cs_doc.post.dto.CommentUpdateRequest;
import com.fasoo.cs_doc.post.service.CommentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "http://localhost:5173")
@Tag(name = "Comments", description = "Comment CRUD APIs")
@RestController
@RequestMapping("/api/comments")
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    @Operation(
            summary = "Create comment",
            description = "Create a comment for a post."
    )
    @PostMapping
    public CommentResponse create(
            @RequestBody @Valid CommentCreateRequest req,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId
    ) {
        // 헤더에서 받은 userId를 사용 (요청 본문의 userId보다 우선)
        Long userId = headerUserId != null ? headerUserId : req.userId();
        CommentCreateRequest updatedReq = new CommentCreateRequest(
                req.postId(),
                req.content(),
                userId
        );
        return commentService.create(updatedReq);
    }

    @Operation(
            summary = "Get comments by post ID",
            description = "Get all comments for a post."
    )
    @GetMapping("/post/{postId}")
    public List<CommentResponse> getByPostId(@PathVariable Long postId) {
        return commentService.findByPostId(postId);
    }

    @Operation(
            summary = "Update comment",
            description = "Update a comment."
    )
    @PatchMapping("/{id}")
    public CommentResponse update(
            @PathVariable Long id,
            @RequestBody @Valid CommentUpdateRequest req,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId
    ) {
        // 헤더에서 받은 userId를 사용 (요청 본문의 userId보다 우선)
        Long userId = headerUserId != null ? headerUserId : req.userId();
        CommentUpdateRequest updatedReq = new CommentUpdateRequest(
                req.content(),
                userId
        );
        return commentService.update(id, updatedReq);
    }

    @Operation(
            summary = "Delete comment",
            description = "Delete a comment. Only the comment author or admin can delete."
    )
    @DeleteMapping("/{id}")
    public void delete(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId
    ) {
        if (headerUserId == null) {
            throw new IllegalStateException("User ID is required to delete a comment");
        }
        commentService.delete(id, headerUserId);
    }
}
