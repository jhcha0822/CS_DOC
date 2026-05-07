package com.fasoo.cs_doc.shortcut.repository;

import com.fasoo.cs_doc.shortcut.domain.ShortcutGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ShortcutGroupRepository extends JpaRepository<ShortcutGroup, Long> {
    List<ShortcutGroup> findAllByOrderBySortOrderAscIdAsc();
}

