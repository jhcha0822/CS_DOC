package com.fasoo.cs_doc.sidebar.controller;

import com.fasoo.cs_doc.sidebar.dto.SidebarMenuSettingDto;
import com.fasoo.cs_doc.sidebar.service.SidebarMenuSettingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "http://localhost:5173")
@Tag(name = "Sidebar Menus", description = "사이드바 고정 메뉴 노출 설정(공개 조회)")
@RestController
@RequestMapping("/api/sidebar-menus")
public class SidebarMenuSettingController {

    private final SidebarMenuSettingService service;

    public SidebarMenuSettingController(SidebarMenuSettingService service) {
        this.service = service;
    }

    @Operation(summary = "Get sidebar menu visibility settings (public)")
    @GetMapping
    public SidebarMenuSettingDto get() {
        return service.getPublic();
    }
}

