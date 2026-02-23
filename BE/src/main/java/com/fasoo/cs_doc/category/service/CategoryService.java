package com.fasoo.cs_doc.category.service;

import com.fasoo.cs_doc.category.domain.Category;
import com.fasoo.cs_doc.category.dto.CategoryBulkUpdateItem;
import com.fasoo.cs_doc.category.dto.CategoryCreateRequest;
import com.fasoo.cs_doc.category.dto.CategoryResponse;
import com.fasoo.cs_doc.category.dto.CategoryUpdateRequest;
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
        List<Category> all = categoryRepository.findAllByOrderBySortOrderAsc();
        Map<Long, String> parentLabels = all.stream()
                .collect(Collectors.toMap(Category::getId, c -> c.getLabel() != null ? c.getLabel() : ""));
        return all.stream()
                .map(c -> CategoryResponse.from(c, parentLabels))
                .toList();
    }

    @Transactional
    public CategoryResponse create(CategoryCreateRequest req) {
        int depth = 0;
        Long parentId = req.parentId();
        String code = null;
        if (parentId != null) {
            Category parent = categoryRepository.findById(parentId)
                    .orElseThrow(() -> new NotFoundException("Parent category not found: " + parentId));
            depth = parent.getDepth() + 1;
        }
        long maxOrder = categoryRepository.findAll().stream()
                .filter(c -> (parentId == null && c.getParentId() == null) || (parentId != null && parentId.equals(c.getParentId())))
                .count();
        Category cat = new Category(code, req.label().trim(), parentId, depth, (int) maxOrder);
        cat = categoryRepository.save(cat);
        Map<Long, String> parentLabels = categoryRepository.findAll().stream()
                .collect(Collectors.toMap(Category::getId, c -> c.getLabel() != null ? c.getLabel() : ""));
        return CategoryResponse.from(cat, parentLabels);
    }

    @Transactional
    public CategoryResponse update(Long id, CategoryUpdateRequest req) {
        Category cat = categoryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Category not found: " + id));
        if (req.label() != null && !req.label().isBlank()) {
            cat.setLabel(req.label().trim());
        }
        if (req.parentId() != null) {
            Category parent = categoryRepository.findById(req.parentId())
                    .orElseThrow(() -> new NotFoundException("Parent category not found: " + req.parentId()));
            cat.setParentId(req.parentId());
            cat.setDepth(parent.getDepth() + 1);
        }
        // parentId가 null이면 부모는 변경하지 않음(라벨만 수정 시)
        cat = categoryRepository.save(cat);
        Map<Long, String> parentLabels = categoryRepository.findAll().stream()
                .collect(Collectors.toMap(Category::getId, c -> c.getLabel() != null ? c.getLabel() : ""));
        return CategoryResponse.from(cat, parentLabels);
    }

    @Transactional
    public void delete(Long id) {
        if (!categoryRepository.existsById(id)) {
            throw new NotFoundException("Category not found: " + id);
        }
        categoryRepository.deleteById(id);
    }

    @Transactional
    public void bulkUpdate(List<CategoryBulkUpdateItem> items) {
        if (items == null) return;
        for (CategoryBulkUpdateItem item : items) {
            if (item.id() == null) continue;
            Category c = categoryRepository.findById(item.id()).orElse(null);
            if (c == null) continue;
            if (item.label() != null && !item.label().isBlank()) c.setLabel(item.label().trim());
            if (item.parentId() != null) {
                c.setParentId(item.parentId());
            } else {
                c.setParentId(null);
            }
            c.setDepth(item.depth());
            c.setSortOrder(item.sortOrder());
            categoryRepository.save(c);
        }
    }

    @Transactional
    public void reorder(List<Long> orderedIds) {
        if (orderedIds == null) return;
        for (int i = 0; i < orderedIds.size(); i++) {
            final int order = i;
            Long id = orderedIds.get(i);
            categoryRepository.findById(id).ifPresent(c -> {
                c.setSortOrder(order);
                categoryRepository.save(c);
            });
        }
    }
}
