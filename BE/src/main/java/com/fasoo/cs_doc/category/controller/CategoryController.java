package com.fasoo.cs_doc.category.controller;

import com.fasoo.cs_doc.category.dto.*;
import com.fasoo.cs_doc.category.service.CategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Category", description = "Category management (for nav/filter). RBAC can be applied later.")
@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @Operation(summary = "List categories", description = "Returns all categories ordered by sortOrder.")
    @GetMapping
    public List<CategoryResponse> list() {
        return categoryService.list();
    }

    @Operation(summary = "Create category")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryResponse create(@Valid @RequestBody CategoryCreateRequest req) {
        return categoryService.create(req);
    }

    @Operation(summary = "Update category")
    @PatchMapping("/{id}")
    public CategoryResponse update(@PathVariable Long id, @RequestBody CategoryUpdateRequest req) {
        return categoryService.update(id, req);
    }

    @Operation(summary = "Reorder categories", description = "Submit ordered list of category ids. New sortOrder = index.")
    @PatchMapping("/reorder")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reorder(@RequestBody CategoryReorderRequest req) {
        categoryService.reorder(req);
    }

    @Operation(summary = "Bulk update categories", description = "Update multiple categories (label, parentId, depth, sortOrder) at once.")
    @PatchMapping("/bulk")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void bulkUpdate(@RequestBody CategoryBulkUpdateRequest req) {
        categoryService.bulkUpdate(req);
    }
}
