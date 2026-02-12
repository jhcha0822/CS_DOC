package com.fasoo.cs_doc.upload;

import com.fasoo.cs_doc.global.config.StorageProperties;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@CrossOrigin(origins = "http://localhost:5173")
@Tag(name = "Upload", description = "Image upload for editor")
@RestController
@RequestMapping("/api/upload")
public class ImageUploadController {

    private final StorageProperties storageProperties;

    public ImageUploadController(StorageProperties storageProperties) {
        this.storageProperties = storageProperties;
    }

    @Operation(summary = "Upload image", description = "Upload an image file; returns URL for use in markdown.")
    @PostMapping(value = "/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ImageUploadResponse uploadImage(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is required");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Only image files are allowed");
        }
        long maxSize = 5L * 1024 * 1024; // 5MB
        if (file.getSize() > maxSize) {
            throw new IllegalArgumentException("Image too large (max 5MB)");
        }

        String ext = contentType.replace("image/", "").toLowerCase();
        if (ext.contains("jpeg")) ext = "jpg";
        String filename = UUID.randomUUID().toString() + "." + ext;

        String uploadDir = storageProperties.uploadDir();
        if (uploadDir == null || uploadDir.isBlank()) {
            String mdRoot = storageProperties.mdRoot();
            if (mdRoot == null || mdRoot.isBlank()) {
                throw new IllegalStateException("Storage path is not configured. Set app.storage.upload-dir or app.storage.md-root.");
            }
            uploadDir = Paths.get(mdRoot).getParent().resolve("uploads").toString();
        }
        // Windows 경로 호환: 슬래시 통일 후 Paths.get 사용
        String normalizedDir = uploadDir.replace('\\', '/').trim();
        Path dir;
        try {
            dir = Paths.get(normalizedDir).toAbsolutePath().normalize();
        } catch (InvalidPathException e) {
            throw new IllegalStateException("Image save path is invalid. Check app.storage.upload-dir configuration.");
        }
        try {
            Files.createDirectories(dir);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot create image upload directory. Check path and permissions.");
        }
        Path target = dir.resolve(filename);
        try {
            Files.copy(file.getInputStream(), target);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to save image file.");
        }

        String url = "/uploads/" + filename;
        return new ImageUploadResponse(url);
    }

    public record ImageUploadResponse(String url) {}
}
