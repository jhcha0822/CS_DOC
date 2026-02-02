package com.fasoo.cs_doc.upload;

import com.fasoo.cs_doc.global.config.StorageProperties;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
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
    public ImageUploadResponse uploadImage(@RequestParam("file") MultipartFile file) throws IOException {
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
            uploadDir = Path.of(storageProperties.mdRoot()).getParent().resolve("uploads").toString();
        }
        Path dir = Path.of(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(dir);
        Path target = dir.resolve(filename);
        Files.copy(file.getInputStream(), target);

        String url = "/uploads/" + filename;
        return new ImageUploadResponse(url);
    }

    public record ImageUploadResponse(String url) {}
}
