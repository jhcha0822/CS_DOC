package com.fasoo.cs_doc.post.service;

import com.fasoo.cs_doc.global.config.StorageProperties;
import com.fasoo.cs_doc.global.exception.NotFoundException;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.LocalDate;
import java.util.UUID;

@Component
public class PostContentStorage {

    private final Path mdRoot;

    public PostContentStorage(StorageProperties props) {
        if (props.mdRoot() == null || props.mdRoot().isBlank()) {
            throw new IllegalStateException("app.storage.md-root is required");
        }
        this.mdRoot = Paths.get(props.mdRoot()).toAbsolutePath().normalize();
    }

    /** 새 글 저장 -> 상대경로 반환 */
    public String saveNew(String markdown, Long postId) {
        // 예: 2026/01/25/1_abcd.md
        LocalDate now = LocalDate.now();
        String fileName = postId + "_" + UUID.randomUUID().toString().replace("-", "") + ".md";
        Path relative = Paths.get(
                String.valueOf(now.getYear()),
                String.format("%02d", now.getMonthValue()),
                String.format("%02d", now.getDayOfMonth()),
                fileName
        );
        write(relative, markdown);
        return normalizeRelative(relative);
    }

    /** 기존 글 덮어쓰기 */
    public void overwrite(String relativePath, String markdown) {
        Path relative = Paths.get(relativePath);
        write(relative, markdown);
    }

    /** 읽기 */
    public String read(String relativePath) {
        Path absolute = resolveSafe(relativePath);
        try {
            if (!Files.exists(absolute)) {
                throw new NotFoundException("Content md not found: " + relativePath);
            }
            return Files.readString(absolute, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to read md: " + relativePath, e);
        }
    }

    private void write(Path relative, String markdown) {
        String rel = normalizeRelative(relative);
        Path absolute = resolveSafe(rel);

        try {
            Files.createDirectories(absolute.getParent());

            // 임시 파일 -> 원자적 교체
            Path tmp = absolute.resolveSibling(absolute.getFileName() + ".tmp");
            Files.writeString(tmp, markdown, StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);

            try {
                Files.move(tmp, absolute, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            } catch (AtomicMoveNotSupportedException ex) {
                Files.move(tmp, absolute, StandardCopyOption.REPLACE_EXISTING);
            }

        } catch (IOException e) {
            throw new IllegalStateException("Failed to write md: " + rel, e);
        }
    }

    /** mdRoot 밖으로 탈출 못하게 고정 */
    private Path resolveSafe(String relativePath) {
        // .., 절대경로 등 방지
        Path rel = Paths.get(relativePath).normalize();
        if (rel.isAbsolute() || relativePath.contains("..")) {
            throw new IllegalArgumentException("Invalid path");
        }
        Path abs = mdRoot.resolve(rel).normalize();
        if (!abs.startsWith(mdRoot)) {
            throw new IllegalArgumentException("Invalid path");
        }
        return abs;
    }

    private String normalizeRelative(Path relative) {
        return relative.normalize().toString().replace('\\', '/');
    }
}
