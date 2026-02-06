package com.fasoo.cs_doc.post.service;

import com.fasoo.cs_doc.global.config.StorageProperties;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 마크다운 내 이미지 참조를 처리하여 서버에 저장하고 경로를 업데이트.
 * - 웹 URL: 다운로드하여 서버에 저장
 * - 로컬 경로: 업로드된 이미지 파일과 매칭하여 서버에 저장
 */
@Component
public class MarkdownImageProcessor {

    private static final Pattern IMAGE_PATTERN = Pattern.compile(
            "!\\[([^\\]]*)\\]\\(([^\\)]+)\\)",
            Pattern.CASE_INSENSITIVE
    );
    private static final Pattern HTML_IMG_PATTERN = Pattern.compile(
            "<img\\s+[^>]*src\\s*=\\s*[\"']([^\"']+)[\"'][^>]*>",
            Pattern.CASE_INSENSITIVE
    );

    private final StorageProperties storageProperties;

    public MarkdownImageProcessor(StorageProperties storageProperties) {
        this.storageProperties = storageProperties;
    }

    /**
     * 마크다운 내 이미지 참조를 처리하여 서버에 저장하고 경로를 업데이트.
     * @param markdown 원본 마크다운
     * @param uploadedImages 업로드된 이미지 파일들 (파일명 -> 파일). null이면 로컬 파일 처리 안 함
     * @return 이미지 경로가 서버 URL로 교체된 마크다운
     */
    public String processImages(String markdown, Map<String, MultipartFile> uploadedImages) {
        if (markdown == null || markdown.isBlank()) {
            return markdown;
        }

        String result = markdown;

        // 마크다운 이미지 문법: ![alt](url)
        result = processMarkdownImages(result, uploadedImages);

        // HTML img 태그: <img src="url">
        result = processHtmlImages(result, uploadedImages);

        return result;
    }

    /**
     * 업로드된 이미지 없이 처리 (웹 URL만 처리)
     */
    public String processImages(String markdown) {
        return processImages(markdown, null);
    }

    private String processMarkdownImages(String markdown, Map<String, MultipartFile> uploadedImages) {
        Matcher matcher = IMAGE_PATTERN.matcher(markdown);
        StringBuffer sb = new StringBuffer();

        while (matcher.find()) {
            String alt = matcher.group(1);
            String imagePath = matcher.group(2).trim();

            String newUrl = processImageUrl(imagePath, uploadedImages);
            matcher.appendReplacement(sb, "![" + alt + "](" + newUrl + ")");
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    private String processHtmlImages(String markdown, Map<String, MultipartFile> uploadedImages) {
        Matcher matcher = HTML_IMG_PATTERN.matcher(markdown);
        StringBuffer sb = new StringBuffer();

        while (matcher.find()) {
            String imagePath = matcher.group(1).trim();
            String newUrl = processImageUrl(imagePath, uploadedImages);
            String originalMatch = matcher.group(0);
            String replaced = originalMatch.replace(imagePath, newUrl);
            matcher.appendReplacement(sb, Matcher.quoteReplacement(replaced));
        }
        matcher.appendTail(sb);
        return sb.toString();
    }

    private String processImageUrl(String imagePath, Map<String, MultipartFile> uploadedImages) {
        if (imagePath == null || imagePath.isBlank()) {
            return imagePath;
        }

        // 이미 서버 URL이면 그대로 반환
        if (imagePath.startsWith("/uploads/")) {
            return imagePath;
        }

        // 웹 URL 처리
        if (isWebUrl(imagePath)) {
            return downloadAndSaveImage(imagePath);
        }

        // 로컬 경로 처리: 업로드된 이미지 파일과 매칭
        if (uploadedImages != null && !uploadedImages.isEmpty()) {
            String localFileName = extractFileName(imagePath);
            if (localFileName != null && !localFileName.isBlank()) {
                // 정확한 파일명 매칭 시도
                MultipartFile uploadedFile = uploadedImages.get(localFileName);
                if (uploadedFile != null) {
                    String savedUrl = saveUploadedImage(uploadedFile);
                    if (savedUrl != null) {
                        return savedUrl;
                    }
                }
                // 대소문자 무시 매칭 시도
                for (Map.Entry<String, MultipartFile> entry : uploadedImages.entrySet()) {
                    if (entry.getKey().equalsIgnoreCase(localFileName)) {
                        String savedUrl = saveUploadedImage(entry.getValue());
                        if (savedUrl != null) {
                            return savedUrl;
                        }
                        break;
                    }
                }
            }
        }

        // 매칭 실패 시 원본 경로 유지
        return imagePath;
    }

    private String extractFileName(String path) {
        if (path == null) return null;
        // 경로에서 파일명 추출 (Windows: \, Unix: /)
        String normalized = path.replace('\\', '/');
        int lastSlash = normalized.lastIndexOf('/');
        if (lastSlash >= 0 && lastSlash < normalized.length() - 1) {
            return normalized.substring(lastSlash + 1);
        }
        return normalized;
    }

    private String saveUploadedImage(MultipartFile file) {
        try {
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return null; // 이미지가 아니면 null 반환 (원본 경로 유지)
            }

            String ext = contentType.replace("image/", "").toLowerCase();
            if (ext.contains("jpeg")) ext = "jpg";
            String filename = UUID.randomUUID().toString() + "." + ext;

            String uploadDir = storageProperties.uploadDir();
            if (uploadDir == null || uploadDir.isBlank()) {
                uploadDir = Path.of(storageProperties.mdRoot()).getParent().resolve("uploads").toString();
            }
            Path dir = Path.of(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(dir);
            Path target = dir.resolve(filename);

            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

            return "/uploads/" + filename;
        } catch (IOException e) {
            return null; // 실패 시 null 반환 (원본 경로 유지)
        }
    }

    private boolean isWebUrl(String path) {
        if (path == null) return false;
        String lower = path.toLowerCase();
        return lower.startsWith("http://") || lower.startsWith("https://");
    }

    private String downloadAndSaveImage(String imageUrl) {
        try {
            URL url = URI.create(imageUrl).toURL();
            String contentType = getContentType(url);

            if (contentType == null || !contentType.startsWith("image/")) {
                // 이미지가 아니면 원본 URL 유지
                return imageUrl;
            }

            String ext = extractExtension(contentType, imageUrl);
            String filename = UUID.randomUUID().toString() + "." + ext;

            String uploadDir = storageProperties.uploadDir();
            if (uploadDir == null || uploadDir.isBlank()) {
                uploadDir = Path.of(storageProperties.mdRoot()).getParent().resolve("uploads").toString();
            }
            Path dir = Path.of(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(dir);
            Path target = dir.resolve(filename);

            try (InputStream in = url.openStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }

            return "/uploads/" + filename;
        } catch (Exception e) {
            // 다운로드 실패 시 원본 URL 유지
            return imageUrl;
        }
    }

    private String getContentType(URL url) {
        try {
            java.net.URLConnection conn = url.openConnection();
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            return conn.getContentType();
        } catch (IOException e) {
            return null;
        }
    }

    private String extractExtension(String contentType, String imageUrl) {
        // Content-Type에서 확장자 추출
        if (contentType != null) {
            String ext = contentType.replace("image/", "").toLowerCase();
            if (ext.contains("jpeg")) return "jpg";
            if (ext.contains("svg")) return "svg";
            if (ext.contains("gif")) return "gif";
            if (ext.contains("png")) return "png";
            if (ext.contains("webp")) return "webp";
        }

        // URL에서 확장자 추출
        try {
            String path = URI.create(imageUrl).getPath();
            int lastDot = path.lastIndexOf('.');
            if (lastDot > 0 && lastDot < path.length() - 1) {
                String ext = path.substring(lastDot + 1).toLowerCase();
                if (ext.length() <= 5 && ext.matches("[a-z0-9]+")) {
                    return ext;
                }
            }
        } catch (Exception ignored) {
        }

        return "jpg"; // 기본값
    }
}
