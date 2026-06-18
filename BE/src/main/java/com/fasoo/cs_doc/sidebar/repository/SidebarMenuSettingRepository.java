package com.fasoo.cs_doc.sidebar.repository;

import com.fasoo.cs_doc.sidebar.domain.SidebarMenuSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SidebarMenuSettingRepository extends JpaRepository<SidebarMenuSetting, Long> {
}

