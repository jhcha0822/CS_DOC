package com.fasoo.cs_doc.shortcut.controller;

import com.fasoo.cs_doc.shortcut.dto.ShortcutDtos.*;
import com.fasoo.cs_doc.shortcut.service.ShortcutService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "http://localhost:5173")
@Tag(name = "Admin Shortcuts", description = "관리자: 헤더 바로가기 그룹/링크 관리")
@RestController
@RequestMapping("/api/admin/shortcuts")
public class AdminShortcutController {

    private final ShortcutService shortcutService;

    public AdminShortcutController(ShortcutService shortcutService) {
        this.shortcutService = shortcutService;
    }

    @Operation(summary = "List groups + items (admin)")
    @GetMapping
    public List<ShortcutGroupResponse> list(
            @RequestHeader(value = "X-User-Id", required = false) Long adminUserId
    ) {
        return shortcutService.listAdmin(adminUserId);
    }

    @Operation(summary = "Create group (admin)")
    @PostMapping("/groups")
    @ResponseStatus(HttpStatus.CREATED)
    public ShortcutGroupResponse createGroup(
            @RequestHeader(value = "X-User-Id", required = false) Long adminUserId,
            @RequestBody @Valid ShortcutGroupCreateRequest req
    ) {
        return shortcutService.createGroup(adminUserId, req);
    }

    @Operation(summary = "Update group (admin)")
    @PutMapping("/groups/{groupId}")
    public ShortcutGroupResponse updateGroup(
            @RequestHeader(value = "X-User-Id", required = false) Long adminUserId,
            @PathVariable Long groupId,
            @RequestBody @Valid ShortcutGroupUpdateRequest req
    ) {
        return shortcutService.updateGroup(adminUserId, groupId, req);
    }

    @Operation(summary = "Delete group + items (admin)")
    @DeleteMapping("/groups/{groupId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteGroup(
            @RequestHeader(value = "X-User-Id", required = false) Long adminUserId,
            @PathVariable Long groupId
    ) {
        shortcutService.deleteGroup(adminUserId, groupId);
    }

    @Operation(summary = "Create item in group (admin)")
    @PostMapping("/groups/{groupId}/items")
    @ResponseStatus(HttpStatus.CREATED)
    public ShortcutItemResponse createItem(
            @RequestHeader(value = "X-User-Id", required = false) Long adminUserId,
            @PathVariable Long groupId,
            @RequestBody @Valid ShortcutItemCreateRequest req
    ) {
        return shortcutService.createItem(adminUserId, groupId, req);
    }

    @Operation(summary = "Update item (admin)")
    @PutMapping("/items/{itemId}")
    public ShortcutItemResponse updateItem(
            @RequestHeader(value = "X-User-Id", required = false) Long adminUserId,
            @PathVariable Long itemId,
            @RequestBody @Valid ShortcutItemUpdateRequest req
    ) {
        return shortcutService.updateItem(adminUserId, itemId, req);
    }

    @Operation(summary = "Delete item (admin)")
    @DeleteMapping("/items/{itemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteItem(
            @RequestHeader(value = "X-User-Id", required = false) Long adminUserId,
            @PathVariable Long itemId
    ) {
        shortcutService.deleteItem(adminUserId, itemId);
    }
}

