package com.fasoo.cs_doc.global.exception;

import io.swagger.v3.oas.annotations.media.Schema;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.server.ResponseStatusException;

import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @Schema(description = "Error response")
    @ExceptionHandler(NotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(NotFoundException e) {
        return new ErrorResponse("NOT_FOUND", e.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(err -> err.getField() + ": " + (err.getDefaultMessage() != null ? err.getDefaultMessage() : "invalid"))
                .collect(Collectors.joining("; "));
        return new ErrorResponse("VALIDATION_ERROR", message);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleBadRequest(IllegalArgumentException e) {
        return new ErrorResponse("BAD_REQUEST", e.getMessage());
    }

    @ExceptionHandler(IllegalStateException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ErrorResponse handleIllegalState(IllegalStateException e) {
        return new ErrorResponse("INTERNAL_ERROR", e.getMessage());
    }

    /**
     * {@link ResponseStatusException}은 {@link Exception}의 하위 타입이라
     * 아래 {@code Exception} 핸들러에 잡히면 403/404 등이 전부 500으로 보였음.
     */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ErrorResponse> handleResponseStatus(ResponseStatusException e) {
        HttpStatusCode status = e.getStatusCode();
        int code = status.value();
        String reason = e.getReason();
        String message = reason != null && !reason.isBlank() ? reason : ("HTTP " + code);
        String errCode = switch (code) {
            case 400 -> "BAD_REQUEST";
            case 401 -> "UNAUTHORIZED";
            case 403 -> "FORBIDDEN";
            case 404 -> "NOT_FOUND";
            default -> "HTTP_" + code;
        };
        return ResponseEntity.status(status).body(new ErrorResponse(errCode, message));
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ErrorResponse handleUnexpected(Exception e) {
        log.error("UNEXPECTED_ERROR", e); // ✅ 스택트레이스 로그
        return new ErrorResponse("UNEXPECTED_ERROR", "Unexpected server error");
    }

    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNoResourceFound(org.springframework.web.servlet.resource.NoResourceFoundException e) {
        // favicon.ico 같은 건 굳이 ERROR로 남기지 않기
        return new ErrorResponse(
                "NOT_FOUND",
                e.getMessage()
        );
    }
}