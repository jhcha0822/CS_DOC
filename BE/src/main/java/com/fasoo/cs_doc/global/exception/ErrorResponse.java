package com.fasoo.cs_doc.global.exception;

public record ErrorResponse(
        String code,
        String message
) {}