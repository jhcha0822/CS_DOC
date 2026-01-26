package com.fasoo.cs_doc.post.controller;

import com.fasoo.cs_doc.global.page.PageResponse;
import com.fasoo.cs_doc.post.dto.*;
import com.fasoo.cs_doc.post.service.PostService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/posts")
public class PostController {

    private final PostService postService;

    public PostController(PostService postService) {
        this.postService = postService;
    }

    @PostMapping
    public PostResponse create(@RequestBody @Valid PostCreateRequest req) {
        return postService.create(req);
    }

    @GetMapping("/{id}")
    public PostDetailResponse get(@PathVariable Long id) {
        return postService.getDetail(id);
    }

    @PutMapping("/{id}")
    public PostResponse update(@PathVariable Long id, @RequestBody @Valid PostUpdateRequest req) {
        return postService.update(id, req);
    }

    @GetMapping
    public PageResponse<PostListItemResponse> list(
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable
    ) {
        return postService.list(pageable);
    }
}
