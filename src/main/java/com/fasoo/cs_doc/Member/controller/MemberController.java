package com.fasoo.cs_doc.Member.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/members")
public class MemberController {

    @GetMapping("/ping")
    public String ping() {
        return "ok";
    }
}

