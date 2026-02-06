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
        // "신입 교육 자료" 카테고리가 있는지 확인 (label 또는 code로)
        Category newbie = categoryRepository.findAll().stream()
                .filter(c -> "신입 교육 자료".equals(c.getLabel()) || "CAT_NEWBIE".equals(c.getCode()))
                .findFirst()
                .orElse(null);
        
        if (newbie == null) {
            // "신입 교육 자료"가 없으면 생성
            newbie = new Category("CAT_NEWBIE", "신입 교육 자료", null, 0, 0);
            newbie = categoryRepository.save(newbie);
        } else {
            // 기존 카테고리가 있으면 label과 code가 올바른지 확인하고 수정
            if (!"신입 교육 자료".equals(newbie.getLabel())) {
                newbie.setLabel("신입 교육 자료");
            }
            if (newbie.getCode() == null || newbie.getCode().isEmpty() || !"CAT_NEWBIE".equals(newbie.getCode())) {
                newbie.setCode("CAT_NEWBIE");
            }
            if (newbie.getParentId() != null || newbie.getDepth() != 0) {
                newbie.setParentId(null);
                newbie.setDepth(0);
            }
            if (newbie.getSortOrder() != 0) {
                newbie.setSortOrder(0);
            }
            categoryRepository.save(newbie);
        }
        
        final Long newbieId = newbie.getId();
        
        // 공지사항 카테고리 확인 및 생성 (최상위 카테고리)
        Category notice = categoryRepository.findAll().stream()
                .filter(c -> "공지사항".equals(c.getLabel()) || "CAT_NOTICE".equals(c.getCode()))
                .findFirst()
                .orElse(null);
        
        if (notice == null) {
            // 공지사항 카테고리가 없으면 생성
            notice = new Category("CAT_NOTICE", "공지사항", null, 0, -1); // sortOrder를 -1로 설정하여 맨 위에 표시
            notice = categoryRepository.save(notice);
        } else {
            // 기존 공지사항 카테고리가 있으면 속성 확인 및 수정
            boolean needsSave = false;
            if (!"공지사항".equals(notice.getLabel())) {
                notice.setLabel("공지사항");
                needsSave = true;
            }
            if (notice.getCode() == null || notice.getCode().isEmpty() || !"CAT_NOTICE".equals(notice.getCode())) {
                notice.setCode("CAT_NOTICE");
                needsSave = true;
            }
            if (notice.getParentId() != null || notice.getDepth() != 0) {
                notice.setParentId(null);
                notice.setDepth(0);
                needsSave = true;
            }
            if (notice.getSortOrder() != -1) {
                notice.setSortOrder(-1);
                needsSave = true;
            }
            if (needsSave) {
                categoryRepository.save(notice);
            }
        }
        
        // 하위 카테고리들 확인 및 수정
        List<String> childLabels = List.of("업무시스템", "장애 지원", "실습");
        List<String> childCodes = List.of("CAT_SYSTEM", "CAT_INCIDENT", "CAT_TRAINING");
        
        for (int i = 0; i < childLabels.size(); i++) {
            String label = childLabels.get(i);
            String code = childCodes.get(i);
            
            // label 또는 code로 기존 카테고리 찾기
            Category child = categoryRepository.findAll().stream()
                    .filter(c -> label.equals(c.getLabel()) || code.equals(c.getCode()))
                    .findFirst()
                    .orElse(null);
            
            if (child == null) {
                // 하위 카테고리가 없으면 생성
                child = new Category(code, label, newbieId, 1, i);
                categoryRepository.save(child);
            } else {
                // 하위 카테고리가 있으면 속성 업데이트
                boolean needsSave = false;
                if (!label.equals(child.getLabel())) {
                    child.setLabel(label);
                    needsSave = true;
                }
                if (child.getCode() == null || child.getCode().isEmpty() || !code.equals(child.getCode())) {
                    child.setCode(code);
                    needsSave = true;
                }
                if (!newbieId.equals(child.getParentId())) {
                    child.setParentId(newbieId);
                    needsSave = true;
                }
                if (child.getDepth() != 1) {
                    child.setDepth(1);
                    needsSave = true;
                }
                if (child.getSortOrder() != i) {
                    child.setSortOrder(i);
                    needsSave = true;
                }
                if (needsSave) {
                    categoryRepository.save(child);
                }
            }
        }
    }
}
