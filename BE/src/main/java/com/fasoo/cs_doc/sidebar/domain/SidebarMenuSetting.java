package com.fasoo.cs_doc.sidebar.domain;

import jakarta.persistence.*;

/**
 * 사이드바 고정 메뉴 노출 설정(단일 레코드).
 * - 카테고리 노출은 category.sidebar_visible 사용
 * - 메모/관리 섹션 등 고정 메뉴는 여기서 제어
 */
@Entity
@Table(name = "sidebar_menu_setting")
public class SidebarMenuSetting {

    @Id
    private Long id = 1L;

    @Column(name = "show_memo", nullable = false)
    private boolean showMemo = true;

    @Column(name = "show_admin_section", nullable = false)
    private boolean showAdminSection = true;

    @Column(name = "show_post_versions", nullable = false)
    private boolean showPostVersions = true;

    @Column(name = "show_user_manage", nullable = false)
    private boolean showUserManage = true;

    @Column(name = "show_admin_shortcuts", nullable = false)
    private boolean showAdminShortcuts = true;

    @Column(name = "show_admin_content_stats", nullable = false)
    private boolean showAdminContentStats = true;

    @Column(name = "show_admin_assignment_grades", nullable = false)
    private boolean showAdminAssignmentGrades = true;

    public SidebarMenuSetting() {}

    public Long getId() {
        return id;
    }

    public boolean isShowMemo() {
        return showMemo;
    }

    public boolean isShowAdminSection() {
        return showAdminSection;
    }

    public boolean isShowPostVersions() {
        return showPostVersions;
    }

    public boolean isShowUserManage() {
        return showUserManage;
    }

    public boolean isShowAdminShortcuts() {
        return showAdminShortcuts;
    }

    public boolean isShowAdminContentStats() {
        return showAdminContentStats;
    }

    public boolean isShowAdminAssignmentGrades() {
        return showAdminAssignmentGrades;
    }

    public void setShowMemo(boolean showMemo) {
        this.showMemo = showMemo;
    }

    public void setShowAdminSection(boolean showAdminSection) {
        this.showAdminSection = showAdminSection;
    }

    public void setShowPostVersions(boolean showPostVersions) {
        this.showPostVersions = showPostVersions;
    }

    public void setShowUserManage(boolean showUserManage) {
        this.showUserManage = showUserManage;
    }

    public void setShowAdminShortcuts(boolean showAdminShortcuts) {
        this.showAdminShortcuts = showAdminShortcuts;
    }

    public void setShowAdminContentStats(boolean showAdminContentStats) {
        this.showAdminContentStats = showAdminContentStats;
    }

    public void setShowAdminAssignmentGrades(boolean showAdminAssignmentGrades) {
        this.showAdminAssignmentGrades = showAdminAssignmentGrades;
    }
}

