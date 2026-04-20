package com.fasoo.cs_doc.post.controller;

import com.fasoo.cs_doc.post.service.AttachmentStorage;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

/**
 * 첨부파일은 디스크에는 UUID 파일명으로 저장되지만, 다운로드 시에는 원본 파일명(Content-Disposition)으로 내려준다.
 */
@RestController
public class AttachmentDownloadController {

    private final AttachmentStorage attachmentStorage;

    public AttachmentDownloadController(AttachmentStorage attachmentStorage) {
        this.attachmentStorage = attachmentStorage;
    }

    @GetMapping("/api/attachments/download")
    public void download(
            @RequestParam("url") String url,
            @RequestParam(value = "name", required = false) String displayName,
            HttpServletResponse response
    ) throws IOException {
        Optional<Path> fileOpt = attachmentStorage.resolveAttachmentFile(url);
        if (fileOpt.isEmpty()) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND);
            return;
        }
        Path file = fileOpt.get();
        String safeName = sanitizeDownloadFilename(displayName, file.getFileName().toString());

        String contentType = Optional.ofNullable(Files.probeContentType(file)).orElse("application/octet-stream");
        response.setContentType(contentType);
        response.setHeader(HttpHeaders.CONTENT_LENGTH, String.valueOf(Files.size(file)));

        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(safeName, StandardCharsets.UTF_8)
                .build();
        response.setHeader(HttpHeaders.CONTENT_DISPOSITION, disposition.toString());

        try (InputStream in = Files.newInputStream(file)) {
            in.transferTo(response.getOutputStream());
        }
    }

    private static String sanitizeDownloadFilename(String requested, String fallbackStoredName) {
        String raw = (requested != null && !requested.isBlank()) ? requested.trim() : fallbackStoredName;
        if (raw == null || raw.isBlank()) {
            return "attachment";
        }
        String s = raw.replace("\r", "").replace("\n", "").replace("\"", "'");
        s = s.replace("/", "_").replace("\\", "_");
        if (s.length() > 200) {
            s = s.substring(0, 200);
        }
        s = s.trim();
        return s.isEmpty() ? "attachment" : s;
    }
}
