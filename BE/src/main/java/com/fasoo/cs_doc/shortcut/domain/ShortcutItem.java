package com.fasoo.cs_doc.shortcut.domain;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "shortcut_item",
        indexes = {
                @Index(name = "idx_shortcut_item_group_sort", columnList = "group_id,sort_order"),
                @Index(name = "idx_shortcut_item_group_id", columnList = "group_id")
        }
)
public class ShortcutItem {

    private static final int NAME_MAX = 80;
    private static final int URL_MAX = 2000;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "group_id", nullable = false)
    private Long groupId;

    @Column(name = "name", nullable = false, length = NAME_MAX)
    private String name;

    @Column(name = "url", nullable = false, length = URL_MAX)
    private String url;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected ShortcutItem() {}

    public ShortcutItem(Long groupId, String name, String url, int sortOrder) {
        if (groupId == null) throw new IllegalArgumentException("groupId가 필요합니다.");
        this.groupId = groupId;
        changeName(name);
        changeUrl(url);
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

    public Long getGroupId() {
        return groupId;
    }

    public String getName() {
        return name;
    }

    public String getUrl() {
        return url;
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
            throw new IllegalArgumentException("링크 이름을 입력해 주세요.");
        }
        String trimmed = name.trim();
        if (trimmed.length() > NAME_MAX) {
            throw new IllegalArgumentException("링크 이름은 " + NAME_MAX + "자 이하여야 합니다.");
        }
        this.name = trimmed;
    }

    public void changeUrl(String url) {
        if (url == null || url.isBlank()) {
            throw new IllegalArgumentException("URL을 입력해 주세요.");
        }
        String trimmed = url.trim();
        if (trimmed.length() > URL_MAX) {
            throw new IllegalArgumentException("URL이 너무 깁니다.");
        }
        if (!(trimmed.startsWith("http://") || trimmed.startsWith("https://"))) {
            throw new IllegalArgumentException("URL은 http:// 또는 https:// 로 시작해야 합니다.");
        }
        this.url = trimmed;
    }

    public void changeSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }
}

