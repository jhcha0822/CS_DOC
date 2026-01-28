package com.fasoo.cs_doc.post.service;

import com.fasoo.cs_doc.global.config.StorageProperties;
import com.fasoo.cs_doc.global.exception.NotFoundException;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;

@Component
public class PostContentStorage {

    private static final String POSTS_DIR = "posts";
    private final Path mdRoot;

    public PostContentStorage(StorageProperties props) {
        if (props.mdRoot() == null || props.mdRoot().isBlank()) {
            throw new IllegalStateException("app.storage.md-root is required");
        }
        this.mdRoot = Paths.get(props.mdRoot()).toAbsolutePath().normalize();
    }

    /** 새 글 저장 -> 상대경로 반환 (항상 posts/{id}.md) */
    public String saveNew(String markdown, Long postId) {
        Path relative = Paths.get(POSTS_DIR, postId + ".md");
        Path abs = resolveSafe(normalizeRelative(relative));

        if (Files.exists(abs)) {
            throw new IllegalStateException("Refuse to overwrite existing md for new post: " + postId);
        }

        write(relative, normalizeMarkdown(markdown));
        return normalizeRelative(relative);
    }

    /** 기존 글 덮어쓰기 */
    public void overwrite(String relativePath, String markdown) {
        Path relative = Paths.get(relativePath);
        write(relative, normalizeMarkdown(markdown));
    }

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

    private Path resolveSafe(String relativePath) {
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

    /** 업로드/에디터 공통 찐빠 방지용 normalize */
    private String normalizeMarkdown(String md) {
        if (md == null) return "";
        // UTF-8 BOM 제거
        if (!md.isEmpty() && md.charAt(0) == '\uFEFF') {
            md = md.substring(1);
        }
        // 줄바꿈 통일
        md = md.replace("\r\n", "\n").replace("\r", "\n");
        return md;
    }

    /** md 파일 삭제 (없으면 그냥 통과) */
    public void deleteIfExists(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) return;

        Path absolute = resolveSafe(relativePath);
        try {
            Files.deleteIfExists(absolute);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to delete md: " + relativePath, e);
        }
    }
}