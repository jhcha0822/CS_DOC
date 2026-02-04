package com.fasoo.cs_doc.category.config;

import com.fasoo.cs_doc.category.domain.Category;
import com.fasoo.cs_doc.category.repository.CategoryRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 애플리케이션 기동 시 카테고리가 비어 있으면 기본 카테고리 삽입.
 * 추후 RBAC 등으로 관리 페이지 접근 제어 시에도 목록/사이드바용 데이터는 유지.
 */
@Component
@Order(1)
public class CategoryDataLoader implements ApplicationRunner {

    private final CategoryRepository categoryRepository;

    public CategoryDataLoader(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        // "신입 교육 자료" 카테고리가 있는지 확인
        Category newbie = categoryRepository.findAll().stream()
                .filter(c -> "신입 교육 자료".equals(c.getLabel()))
                .findFirst()
                .orElse(null);
        
        if (newbie == null) {
            // "신입 교육 자료"가 없으면 생성
            newbie = new Category("CAT_NEWBIE", "신입 교육 자료", null, 0, 0);
            newbie = categoryRepository.save(newbie);
        }
        
        final Long newbieId = newbie.getId();
        
        // 하위 카테고리들 확인 및 수정
        List<String> childLabels = List.of("업무시스템", "장애 지원", "실습");
        List<String> childCodes = List.of("CAT_SYSTEM", "CAT_INCIDENT", "CAT_TRAINING");
        
        for (int i = 0; i < childLabels.size(); i++) {
            String label = childLabels.get(i);
            String code = childCodes.get(i);
            
            Category child = categoryRepository.findAll().stream()
                    .filter(c -> label.equals(c.getLabel()))
                    .findFirst()
                    .orElse(null);
            
            if (child == null) {
                // 하위 카테고리가 없으면 생성
                child = new Category(code, label, newbieId, 1, i);
                categoryRepository.save(child);
            } else {
                // 하위 카테고리가 있지만 parent_id가 잘못되었으면 수정
                if (!newbieId.equals(child.getParentId()) || child.getDepth() != 1) {
                    child.setParentId(newbieId);
                    child.setDepth(1);
                    child.setSortOrder(i);
                    if (child.getCode() == null || child.getCode().isEmpty()) {
                        child.setCode(code);
                    }
                    categoryRepository.save(child);
                }
            }
        }
    }
}
