package com.fasoo.cs_doc.member.controller;

import com.fasoo.cs_doc.member.dto.LoginRequest;
import com.fasoo.cs_doc.member.dto.UserResponse;
import com.fasoo.cs_doc.member.service.MemberService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class AuthController {

    private final MemberService memberService;

    @Operation(summary = "로그인 (아이디/비밀번호)")
    @PostMapping("/login")
    @ResponseStatus(HttpStatus.OK)
    public UserResponse login(@Valid @RequestBody LoginRequest request) {
        return memberService.login(request.username(), request.password());
    }
}
