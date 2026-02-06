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

    @Operation(
            summary = "Increment view count",
            description = "Increment view count for a post. Should be called separately from get detail."
    )
    @PostMapping("/{id}/view")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void incrementViewCount(@PathVariable Long id) {
        postService.incrementViewCount(id);
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

            @Parameter(description = "Search scope: title, content, author, all. Default title.")
            @RequestParam(required = false) String searchIn,

            @Parameter(
                    description = "Category filters (repeatable). e.g. categories=TRAINING&categories=SYSTEM. If omitted, all categories.",
                    example = "TRAINING"
            )
            @RequestParam(required = false) List<String> categories,

            @Parameter(description = "Category ID filter. If provided, includes the category and all its children.")
            @RequestParam(required = false) Long categoryId,

            @ParameterObject
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable
    ) {
        return postService.list(pageable, keyword, searchIn, categories, categoryId);
    }

    @Operation(
            summary = "Create post by uploading .md file",
            description = "Upload a markdown file and create a post. If title is omitted, service may derive or set default title. categoryId is required. Optionally upload image files referenced in markdown."
    )
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PostResponse createByUpload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "categoryId") Long categoryId,
            @RequestParam(value = "isNotice", required = false) Boolean isNotice,
            @RequestParam(value = "images", required = false) List<MultipartFile> images,
            @RequestParam(value = "attachments", required = false) List<MultipartFile> attachments
    ) {
        org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(PostController.class);
        log.info("createByUpload received - categoryId={}, title={}, isNotice={}", categoryId, title, isNotice);
        return postService.createByUpload(file, title, null, categoryId, isNotice, images, attachments);
    }

    @Operation(
            summary = "Update post content by uploading .md file",
            description = "Upload a markdown file to overwrite existing content. Title is optional. Optionally upload image files referenced in markdown."
    )
    @PutMapping(value = "/{id}/content/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PostResponse updateContentByUpload(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "images", required = false) List<MultipartFile> images,
            @RequestParam(value = "attachments", required = false) List<MultipartFile> attachments
    ) {
        return postService.updateByUpload(id, file, title, images, attachments);
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
            summary = "Add attachments to post",
            description = "Add attachment files to an existing post."
    )
    @PostMapping(value = "/{id}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PostResponse addAttachments(
            @PathVariable Long id,
            @RequestParam("attachments") List<MultipartFile> attachments
    ) {
        return postService.addAttachments(id, attachments);
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

    @Operation(
            summary = "Get post versions",
            description = "Get all versions of a post (including deleted posts)."
    )
    @GetMapping("/{id}/versions")
    public List<com.fasoo.cs_doc.post.dto.PostVersionResponse> getVersions(@PathVariable Long id) {
        return postService.getVersions(id).stream()
                .map(com.fasoo.cs_doc.post.dto.PostVersionResponse::from)
                .toList();
    }

    @Operation(
            summary = "Get specific version",
            description = "Get a specific version of a post (including deleted posts)."
    )
    @GetMapping("/{id}/versions/{versionNumber}")
    public com.fasoo.cs_doc.post.dto.PostVersionResponse getVersion(
            @PathVariable Long id,
            @PathVariable Integer versionNumber
    ) {
        return com.fasoo.cs_doc.post.dto.PostVersionResponse.from(postService.getVersion(id, versionNumber));
    }

    @Operation(
            summary = "List deleted posts",
            description = "List deleted posts for version history page. Can search by keyword or post ID."
    )
    @GetMapping("/deleted")
    public PageResponse<PostListItemResponse> listDeleted(
            @Parameter(description = "Search keyword (title)")
            @RequestParam(required = false) String keyword,
            
            @Parameter(description = "Post ID filter")
            @RequestParam(required = false) Long postId,
            
            @ParameterObject
            @PageableDefault(size = 20, sort = "updatedAt", direction = Sort.Direction.DESC)
            Pageable pageable
    ) {
        return postService.listDeleted(pageable, keyword, postId);
    }

    @Operation(
            summary = "Get deletion history",
            description = "Get all deleted posts ordered by deletion time (newest first)."
    )
    @GetMapping("/deleted/history")
    public List<PostListItemResponse> getDeletionHistory() {
        return postService.getDeletionHistory();
    }

    @Operation(
            summary = "Get all change history",
            description = "Get all change history (create, update, delete) across all posts. Can filter by change type."
    )
    @GetMapping("/changes/history")
    public List<com.fasoo.cs_doc.post.dto.ChangeHistoryItem> getAllChangeHistory(
            @Parameter(description = "Change type filter: null(전체), 생성, 수정, 삭제")
            @RequestParam(required = false) String changeType
    ) {
        return postService.getAllChangeHistory(changeType);
    }
}
