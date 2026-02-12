package com.fasoo.cs_doc.memo.controller;

import com.fasoo.cs_doc.global.page.PageResponse;
import com.fasoo.cs_doc.memo.dto.*;
import com.fasoo.cs_doc.memo.service.MemoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.PostConstruct;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "http://localhost:5173")
@Tag(name = "Memos", description = "Lightweight tips/memos (title + body + images, max 10 images)")
@RestController
@RequestMapping("/api/memos")
public class MemoController {

    private static final Logger log = LoggerFactory.getLogger(MemoController.class);

    private final MemoService memoService;

    public MemoController(MemoService memoService) {
        this.memoService = memoService;
    }

    @PostConstruct
    void init() {
        log.info("MemoController registered: /api/memos");
    }

    @Operation(summary = "Create memo")
    @PostMapping
    public MemoResponse create(@RequestBody @Valid MemoCreateRequest req) {
        return memoService.create(req);
    }

    @Operation(summary = "Get memo by id")
    @GetMapping("/{id}")
    public MemoResponse get(@PathVariable Long id) {
        return memoService.getById(id);
    }

    @Operation(summary = "List memos with optional keyword search (title + body)")
    @GetMapping
    public PageResponse<MemoListItemResponse> list(
            @Parameter(description = "Search in title and body")
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        return memoService.list(keyword, page, size);
    }

    @Operation(summary = "Update memo")
    @PutMapping("/{id}")
    public MemoResponse update(@PathVariable Long id, @RequestBody @Valid MemoUpdateRequest req) {
        return memoService.update(id, req);
    }

    @Operation(summary = "Delete memo")
    @DeleteMapping("/{id}")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        memoService.delete(id);
    }
}
