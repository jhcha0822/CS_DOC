package com.fasoo.cs_doc.category.repository;

import com.fasoo.cs_doc.category.domain.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    List<Category> findAllByOrderBySortOrderAsc();

    List<Category> findByParentIdOrderBySortOrderAsc(Long parentId);

    List<Category> findByParentIdIsNullOrderBySortOrderAsc();
}
