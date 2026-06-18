package com.fasoo.cs_doc.sidebar.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasoo.cs_doc.sidebar.domain.SidebarMenuSetting;

public record SidebarMenuSettingDto(
        @JsonProperty("showMemo") boolean showMemo,
        @JsonProperty("showAdminSection") boolean showAdminSection,
        @JsonProperty("showPostVersions") boolean showPostVersions,
        @JsonProperty("showUserManage") boolean showUserManage,
        @JsonProperty("showAdminShortcuts") boolean showAdminShortcuts,
        @JsonProperty("showAdminContentStats") boolean showAdminContentStats,
        @JsonProperty("showAdminAssignmentGrades") boolean showAdminAssignmentGrades
) {
    public static SidebarMenuSettingDto from(SidebarMenuSetting s) {
        return new SidebarMenuSettingDto(
                s.isShowMemo(),
                s.isShowAdminSection(),
                s.isShowPostVersions(),
                s.isShowUserManage(),
                s.isShowAdminShortcuts(),
                s.isShowAdminContentStats(),
                s.isShowAdminAssignmentGrades()
        );
    }
}

