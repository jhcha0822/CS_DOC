package com.fasoo.cs_doc.shortcut.domain;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "shortcut_group",
        indexes = {
                @Index(name = "idx_shortcut_group_sort_order", columnList = "sort_order")
        }
)
public class ShortcutGroup {

    private static final int NAME_MAX = 50;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = NAME_MAX)
    private String name;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected ShortcutGroup() {}

    public ShortcutGroup(String name, int sortOrder) {
        changeName(name);
        this.sortOrder = sortOrder;
    }

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void changeName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("그룹 이름을 입력해 주세요.");
        }
        String trimmed = name.trim();
        if (trimmed.length() > NAME_MAX) {
            throw new IllegalArgumentException("그룹 이름은 " + NAME_MAX + "자 이하여야 합니다.");
        }
        this.name = trimmed;
    }

    public void changeSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }
}

