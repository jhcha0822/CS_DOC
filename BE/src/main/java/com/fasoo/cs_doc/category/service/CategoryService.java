package com.fasoo.cs_doc.category.service;

import com.fasoo.cs_doc.category.domain.Category;
import com.fasoo.cs_doc.category.dto.*;
import com.fasoo.cs_doc.category.repository.CategoryRepository;
import com.fasoo.cs_doc.global.exception.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> list() {
        try {
            List<Category> all = categoryRepository.findAllByOrderBySortOrderAsc();
            if (all == null || all.isEmpty()) {
                return List.of();
            }
            Map<Long, String> parentLabels = all.stream()
                    .filter(c -> c.getId() != null && c.getLabel() != null)
                    .collect(Collectors.toMap(Category::getId, Category::getLabel));
            return all.stream()
                    .filter(c -> c.getId() != null && c.getLabel() != null)
                    .map(c -> CategoryResponse.from(c, parentLabels))
                    .toList();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to list categories: " + e.getMessage(), e);
        }
    }

    @Transactional
    public CategoryResponse create(CategoryCreateRequest req) {
        Long parentId = req.parentId();
        int depth = 0;
        if (parentId != null) {
            Category parent = categoryRepository.findById(parentId)
                    .orElseThrow(() -> new NotFoundException("Parent Category", parentId));
            depth = parent.getDepth() + 1;
        }
        List<Category> siblings = parentId == null
                ? categoryRepository.findByParentIdIsNullOrderBySortOrderAsc()
                : categoryRepository.findByParentIdOrderBySortOrderAsc(parentId);
        int maxOrder = siblings.stream()
                .mapToInt(Category::getSortOrder)
                .max()
                .orElse(-1);
        String code = "CAT_" + System.currentTimeMillis(); // 임시 코드, 내부용
        Category c = new Category(code, req.label().trim(), parentId, depth, maxOrder + 1);
        Category saved = categoryRepository.save(c);
        Map<Long, String> parentLabels = categoryRepository.findAll().stream()
                .collect(Collectors.toMap(Category::getId, Category::getLabel));
        return CategoryResponse.from(saved, parentLabels);
    }

    @Transactional
    public CategoryResponse update(Long id, CategoryUpdateRequest req) {
        Category c = categoryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Category", id));
        if (req.label() != null && !req.label().isBlank()) {
            c.setLabel(req.label().trim());
        }
        Long newParentId = req.parentId();
        if (newParentId != null && !newParentId.equals(c.getParentId())) {
            if (newParentId.equals(c.getId())) {
                throw new IllegalArgumentException("Category cannot be its own parent");
            }
            Category newParent = categoryRepository.findById(newParentId)
                    .orElseThrow(() -> new NotFoundException("Parent Category", newParentId));
            c.setParentId(newParentId);
            c.setDepth(newParent.getDepth() + 1);
        } else if (newParentId == null && c.getParentId() != null) {
            c.setParentId(null);
            c.setDepth(0);
        }
        Category saved = categoryRepository.save(c);
        Map<Long, String> parentLabels = categoryRepository.findAll().stream()
                .collect(Collectors.toMap(Category::getId, Category::getLabel));
        return CategoryResponse.from(saved, parentLabels);
    }

    @Transactional
    public void bulkUpdate(CategoryBulkUpdateRequest req) {
        if (req.items() == null || req.items().isEmpty()) return;
        List<Long> ids = req.items().stream().map(CategoryBulkUpdateItem::id).toList();
        List<Category> all = categoryRepository.findAllById(ids);
        if (all.size() != ids.size()) {
            throw new IllegalArgumentException("Some category ids not found");
        }
        Map<Long, Category> categoryMap = all.stream()
                .collect(Collectors.toMap(Category::getId, c -> c));
        List<Category> allCategories = categoryRepository.findAll();
        Map<Long, Category> allCategoryMap = allCategories.stream()
                .collect(Collectors.toMap(Category::getId, c -> c));
        
        for (CategoryBulkUpdateItem item : req.items()) {
            Category c = categoryMap.get(item.id());
            if (c == null) continue;
            if (item.label() != null && !item.label().isBlank()) {
                c.setLabel(item.label().trim());
            }
            Long newParentId = item.parentId();
            if (newParentId != null && newParentId.equals(c.getId())) {
                throw new IllegalArgumentException("Category cannot be its own parent: " + c.getId());
            }
            if (newParentId != null) {
                Category parent = allCategoryMap.get(newParentId);
                if (parent == null) {
                    parent = categoryRepository.findById(newParentId).orElse(null);
                    if (parent != null) {
                        allCategoryMap.put(newParentId, parent);
                    }
                }
                if (parent != null) {
                    Long checkParentId = parent.getParentId();
                    Long checkId = c.getId();
                    while (checkParentId != null) {
                        if (checkParentId.equals(checkId)) {
                            throw new IllegalArgumentException("Circular reference detected");
                        }
                        Category checkParent = allCategoryMap.get(checkParentId);
                        if (checkParent == null) break;
                        checkParentId = checkParent.getParentId();
                    }
                    c.setParentId(newParentId);
                    c.setDepth(parent.getDepth() + 1);
                } else {
                    throw new NotFoundException("Parent Category", newParentId);
                }
            } else {
                c.setParentId(null);
                c.setDepth(0);
            }
            c.setSortOrder(item.sortOrder());
        }
        categoryRepository.saveAll(all);
    }

    @Transactional
    public void reorder(CategoryReorderRequest req) {
        if (req.orderedIds() == null || req.orderedIds().isEmpty()) return;
        List<Category> all = categoryRepository.findAllById(req.orderedIds());
        if (all.size() != req.orderedIds().size()) {
            throw new IllegalArgumentException("Some category ids not found");
        }
        for (int i = 0; i < req.orderedIds().size(); i++) {
            Long id = req.orderedIds().get(i);
            Category c = all.stream().filter(x -> x.getId().equals(id)).findFirst().orElseThrow();
            c.setSortOrder(i);
        }
        categoryRepository.saveAll(all);
    }
}
