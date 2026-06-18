package com.fasoo.cs_doc.sidebar.controller;

import com.fasoo.cs_doc.sidebar.dto.SidebarMenuSettingDto;
import com.fasoo.cs_doc.sidebar.dto.SidebarMenuSettingUpdateRequest;
import com.fasoo.cs_doc.sidebar.service.SidebarMenuSettingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "http://localhost:5173")
@Tag(name = "Admin Sidebar Menus", description = "관리자: 사이드바 고정 메뉴 노출 설정")
@RestController
@RequestMapping("/api/admin/sidebar-menus")
public class AdminSidebarMenuSettingController {

    private final SidebarMenuSettingService service;

    public AdminSidebarMenuSettingController(SidebarMenuSettingService service) {
        this.service = service;
    }

    @Operation(summary = "Get settings (admin)")
    @GetMapping
    public SidebarMenuSettingDto get(@RequestHeader(value = "X-User-Id", required = false) Long adminUserId) {
        return service.getAdmin(adminUserId);
    }

    @Operation(summary = "Update settings (admin)")
    @PutMapping
    public SidebarMenuSettingDto update(
            @RequestHeader(value = "X-User-Id", required = false) Long adminUserId,
            @RequestBody @Valid SidebarMenuSettingUpdateRequest req
    ) {
        return service.update(adminUserId, req);
    }
}

