package com.fasoo.cs_doc.member.controller;

import com.fasoo.cs_doc.member.dto.UserCreateRequest;
import com.fasoo.cs_doc.member.dto.UserResponse;
import com.fasoo.cs_doc.member.dto.UserUpdateRequest;
import com.fasoo.cs_doc.member.service.MemberService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
public class MemberController {

    private final MemberService memberService;

    @Operation(summary = "사용자 목록 조회")
    @GetMapping
    public List<UserResponse> list() {
        return memberService.findAll();
    }

    @Operation(summary = "사용자 상세 조회")
    @GetMapping("/{id}")
    public UserResponse get(@Parameter(description = "사용자 ID") @PathVariable Long id) {
        return memberService.findById(id);
    }

    @Operation(summary = "사용자 생성")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse create(@Valid @RequestBody UserCreateRequest request) {
        return memberService.create(request);
    }

    @Operation(summary = "사용자 수정")
    @PatchMapping("/{id}")
    public UserResponse update(
            @Parameter(description = "사용자 ID") @PathVariable Long id,
            @Valid @RequestBody UserUpdateRequest request
    ) {
        return memberService.update(id, request);
    }

    @Operation(summary = "사용자 삭제")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@Parameter(description = "사용자 ID") @PathVariable Long id) {
        memberService.delete(id);
    }
}

