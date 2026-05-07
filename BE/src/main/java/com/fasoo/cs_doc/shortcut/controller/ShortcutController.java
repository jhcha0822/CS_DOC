package com.fasoo.cs_doc.shortcut.controller;

import com.fasoo.cs_doc.shortcut.dto.ShortcutDtos.ShortcutGroupResponse;
import com.fasoo.cs_doc.shortcut.service.ShortcutService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "http://localhost:5173")
@Tag(name = "Shortcuts", description = "Header quick links (public list)")
@RestController
@RequestMapping("/api/shortcuts")
public class ShortcutController {

    private final ShortcutService shortcutService;

    public ShortcutController(ShortcutService shortcutService) {
        this.shortcutService = shortcutService;
    }

    @Operation(summary = "List shortcut groups + items (for header)")
    @GetMapping
    public List<ShortcutGroupResponse> list() {
        return shortcutService.listPublic();
    }
}

