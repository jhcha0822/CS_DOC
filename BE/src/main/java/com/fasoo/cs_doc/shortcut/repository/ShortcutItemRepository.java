package com.fasoo.cs_doc.shortcut.repository;

import com.fasoo.cs_doc.shortcut.domain.ShortcutItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ShortcutItemRepository extends JpaRepository<ShortcutItem, Long> {
    List<ShortcutItem> findByGroupIdOrderBySortOrderAscIdAsc(Long groupId);
    void deleteByGroupId(Long groupId);
}

