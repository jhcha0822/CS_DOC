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

    protected Category() {}

    public Category(String code, String label, Long parentId, int depth, int sortOrder) {
        this.code = code;
        this.label = label;
        this.parentId = parentId;
        this.depth = depth;
        this.sortOrder = sortOrder;
    }

    public Long getId() { return id; }
    public String getCode() { return code; }
    public String getLabel() { return label; }
    public Long getParentId() { return parentId; }
    public int getDepth() { return depth; }
    public int getSortOrder() { return sortOrder; }

    public void setCode(String code) { this.code = code; }
    public void setLabel(String label) { this.label = label; }
    public void setParentId(Long parentId) { this.parentId = parentId; }
    public void setDepth(int depth) { this.depth = depth; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
}
