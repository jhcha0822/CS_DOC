package com.fasoo.cs_doc.post.controller;

import com.fasoo.cs_doc.global.page.PageResponse;
import com.fasoo.cs_doc.post.dto.*;
import com.fasoo.cs_doc.post.service.PostService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@CrossOrigin(origins = "http://localhost:5173")
@Tag(name = "Posts", description = "Posts CRUD and markdown content APIs")
@RestController
@RequestMapping("/api/posts")
public class PostController {

    private final PostService postService;

    public PostController(PostService postService) {
        this.postService = postService;
    }

    @Operation(
            summary = "Create post (JSON)",
            description = "Create a post by sending title and markdown in JSON."
    )
    @PostMapping
    public PostResponse create(@RequestBody @Valid PostCreateRequest req) {
        return postService.create(req);
    }

    @Operation(
            summary = "Get post detail",
            description = "Get post detail (currently includes markdown)."
    )
    @GetMapping("/{id}")
    public PostDetailResponse get(@PathVariable Long id) {
        return postService.getDetail(id);
    }

    /**
     * 예전 방식(전체 PUT 수정). 현재는 PATCH를 표준으로 쓰는 방향이면 Swagger에서 숨김 처리.
     * 필요해지면 hidden=false 로 돌리면 됨.
     */
    @Operation(hidden = true)
    @PutMapping("/{id}")
    public PostResponse update(@PathVariable Long id, @RequestBody @Valid PostUpdateRequest req) {
        return postService.update(id, req);
    }

    @Operation(
            summary = "List posts",
            description = "List posts with optional keyword and category filters. Default sort is createdAt desc."
    )
    @GetMapping
    public PageResponse<PostListItemResponse> list(
            @Parameter(description = "Title keyword (contains, case-insensitive)", example = "테스트")
            @RequestParam(required = false) String keyword,

            @Parameter(
                    description = "Category filters (repeatable). e.g. categories=PRACTICE&categories=SYSTEM. If omitted, all categories.",
                    example = "PRACTICE"
            )
            @RequestParam(required = false) List<String> categories,

            @ParameterObject
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable
    ) {
        return postService.list(pageable, keyword, categories);
    }

    @Operation(
            summary = "Create post by uploading .md file",
            description = "Upload a markdown file and create a post. If title is omitted, service may derive or set default title."
    )
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PostResponse createByUpload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "title", required = false) String title
    ) {
        return postService.createByUpload(file, title);
    }

    @Operation(
            summary = "Update post content by uploading .md file",
            description = "Upload a markdown file to overwrite existing content. Title is optional."
    )
    @PutMapping(value = "/{id}/content/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PostResponse updateContentByUpload(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "title", required = false) String title
    ) {
        return postService.updateByUpload(id, file, title);
    }

    @Operation(
            summary = "Get post markdown content",
            description = "Returns markdown content for a post."
    )
    @GetMapping("/{id}/content")
    public PostContentResponse getContent(@PathVariable Long id) {
        return postService.getContent(id);
    }

    @Operation(
            summary = "Patch post",
            description = "Update title and/or markdown content. Provide at least one field."
    )
    @PatchMapping("/{id}")
    public PostResponse patch(
            @PathVariable Long id,
            @RequestBody PostPatchRequest req
    ) {
        return postService.patch(id, req);
    }

    @Operation(
            summary = "Delete post",
            description = "Delete the post row and its markdown file."
    )
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        postService.delete(id);
    }
}
