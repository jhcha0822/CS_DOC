package com.fasoo.cs_doc.shortcut.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public class ShortcutDtos {

    public record ShortcutItemResponse(
            long id,
            String name,
            String url,
            int sortOrder
    ) {}

    public record ShortcutGroupResponse(
            long id,
            String name,
            int sortOrder,
            List<ShortcutItemResponse> items
    ) {}

    public record ShortcutGroupCreateRequest(
            @NotBlank(message = "그룹 이름을 입력해 주세요.")
            String name,
            Integer sortOrder
    ) {}

    public record ShortcutGroupUpdateRequest(
            @NotBlank(message = "그룹 이름을 입력해 주세요.")
            String name,
            Integer sortOrder
    ) {}

    public record ShortcutItemCreateRequest(
            @NotBlank(message = "링크 이름을 입력해 주세요.")
            String name,
            @NotBlank(message = "URL을 입력해 주세요.")
            String url,
            Integer sortOrder
    ) {}

    public record ShortcutItemUpdateRequest(
            @NotBlank(message = "링크 이름을 입력해 주세요.")
            String name,
            @NotBlank(message = "URL을 입력해 주세요.")
            String url,
            Integer sortOrder
    ) {}
}

