package com.fasoo.cs_doc.sidebar.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record SidebarMenuSettingUpdateRequest(
        @JsonProperty("showMemo") Boolean showMemo,
        @JsonProperty("showAdminSection") Boolean showAdminSection,
        @JsonProperty("showPostVersions") Boolean showPostVersions,
        @JsonProperty("showUserManage") Boolean showUserManage,
        @JsonProperty("showAdminShortcuts") Boolean showAdminShortcuts,
        @JsonProperty("showAdminContentStats") Boolean showAdminContentStats,
        @JsonProperty("showAdminAssignmentGrades") Boolean showAdminAssignmentGrades
) {}

