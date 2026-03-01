package com.fasoo.cs_doc.category.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "category", indexes = {
        @Index(name = "idx_category_sort_order", columnList = "sort_order")
})
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = true, length = 64)
    private String code;

    @Column(nullable = false, length = 100)
    private String label;

    @Column(nullable = true, name = "parent_id")
    private Long parentId;

    @Column(nullable = false, name = "depth")
    private int depth;

    @Column(nullable = false, name = "sort_order")
    private int sortOrder;

    /** 게시글 등록 시 일반 사용자에게 노출하지 않음(관리자만 선택 가능). 카테고리 관리 페이지에서 체크박스로 설정 */
    @Column(name = "admin_only", nullable = false)
    private boolean adminOnly = false;

    protected Category() {}

    public Category(String code, String label, Long parentId, int depth, int sortOrder) {
        this.code = code;
        this.label = label;
        this.parentId = parentId;
        this.depth = depth;
        this.sortOrder = sortOrder;
    }

    public Category(String code, String label, Long parentId, int depth, int sortOrder, boolean adminOnly) {
        this.code = code;
        this.label = label;
        this.parentId = parentId;
        this.depth = depth;
        this.sortOrder = sortOrder;
        this.adminOnly = adminOnly;
    }

    public Long getId() { return id; }
    public String getCode() { return code; }
    public String getLabel() { return label; }
    public Long getParentId() { return parentId; }
    public int getDepth() { return depth; }
    public int getSortOrder() { return sortOrder; }
    public boolean isAdminOnly() { return adminOnly; }

    public void setCode(String code) { this.code = code; }
    public void setLabel(String label) { this.label = label; }
    public void setParentId(Long parentId) { this.parentId = parentId; }
    public void setDepth(int depth) { this.depth = depth; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
    public void setAdminOnly(boolean adminOnly) { this.adminOnly = adminOnly; }
}
