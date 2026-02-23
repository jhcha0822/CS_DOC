package com.fasoo.cs_doc.category.controller;

import com.fasoo.cs_doc.category.dto.CategoryBulkUpdateRequest;
import com.fasoo.cs_doc.category.dto.CategoryCreateRequest;
import com.fasoo.cs_doc.category.dto.CategoryResponse;
import com.fasoo.cs_doc.category.dto.CategoryReorderRequest;
import com.fasoo.cs_doc.category.dto.CategoryUpdateRequest;
import com.fasoo.cs_doc.category.service.CategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "http://localhost:5173")
@Tag(name = "Categories", description = "카테고리 목록·생성·수정·삭제·일괄·순서변경")
@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @Operation(summary = "카테고리 목록 조회")
    @GetMapping
    public List<CategoryResponse> list() {
        return categoryService.list();
    }

    @Operation(summary = "카테고리 생성")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryResponse create(@RequestBody @Valid CategoryCreateRequest req) {
        return categoryService.create(req);
    }

    @Operation(summary = "카테고리 수정")
    @PatchMapping("/{id}")
    public CategoryResponse update(@PathVariable Long id, @RequestBody @Valid CategoryUpdateRequest req) {
        return categoryService.update(id, req);
    }

    @Operation(summary = "카테고리 삭제")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        categoryService.delete(id);
    }

    @Operation(summary = "카테고리 일괄 수정")
    @PatchMapping("/bulk")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void bulkUpdate(@RequestBody @Valid CategoryBulkUpdateRequest req) {
        categoryService.bulkUpdate(req.items());
    }

    @Operation(summary = "카테고리 순서 변경")
    @PatchMapping("/reorder")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reorder(@RequestBody @Valid CategoryReorderRequest req) {
        categoryService.reorder(req.orderedIds());
    }
}
