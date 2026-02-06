package com.fasoo.cs_doc.post.service;

import com.fasoo.cs_doc.global.config.StorageProperties;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Component
public class AttachmentStorage {

    private static final String ATTACHMENTS_DIR = "attachments";
    private static final long MAX_FILE_SIZE = 50L * 1024 * 1024; // 50MB
    private final Path uploadRoot;

    public AttachmentStorage(StorageProperties props) {
        String uploadDir = props.uploadDir();
        if (uploadDir == null || uploadDir.isBlank()) {
            uploadDir = Path.of(props.mdRoot()).getParent().resolve("uploads").toString();
        }
        this.uploadRoot = Path.of(uploadDir).toAbsolutePath().normalize();
    }

    /**
     * 첨부파일들을 저장하고 URL 목록 반환
     */
    public List<String> saveAttachments(List<MultipartFile> files) throws IOException {
        if (files == null || files.isEmpty()) {
            return new ArrayList<>();
        }

        List<String> urls = new ArrayList<>();
        Path attachmentsDir = uploadRoot.resolve(ATTACHMENTS_DIR);
        Files.createDirectories(attachmentsDir);

        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) {
                continue;
            }

            if (file.getSize() > MAX_FILE_SIZE) {
                throw new IllegalArgumentException("File too large (max 50MB): " + file.getOriginalFilename());
            }

            String originalFilename = file.getOriginalFilename();
            if (originalFilename == null || originalFilename.isBlank()) {
                continue;
            }

            // 파일명에서 확장자 추출
            String ext = "";
            int lastDot = originalFilename.lastIndexOf('.');
            if (lastDot >= 0 && lastDot < originalFilename.length() - 1) {
                ext = originalFilename.substring(lastDot);
            }

            String filename = UUID.randomUUID().toString() + ext;
            Path target = attachmentsDir.resolve(filename);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

            String url = "/uploads/" + ATTACHMENTS_DIR + "/" + filename;
            urls.add(url);
        }

        return urls;
    }

    /**
     * 첨부파일 삭제 (게시글 삭제 시 사용)
     */
    public void deleteAttachments(List<String> urls) {
        if (urls == null || urls.isEmpty()) {
            return;
        }

        for (String url : urls) {
            if (url == null || !url.startsWith("/uploads/" + ATTACHMENTS_DIR + "/")) {
                continue;
            }

            String filename = url.substring(("/uploads/" + ATTACHMENTS_DIR + "/").length());
            Path file = uploadRoot.resolve(ATTACHMENTS_DIR).resolve(filename);
            try {
                Files.deleteIfExists(file);
            } catch (IOException e) {
                // 로그만 남기고 계속 진행
                System.err.println("Failed to delete attachment: " + url + " - " + e.getMessage());
            }
        }
    }
}
