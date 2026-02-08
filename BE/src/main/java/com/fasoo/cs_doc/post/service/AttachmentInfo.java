package com.fasoo.cs_doc.post.service;

public record AttachmentInfo(String url, String originalFilename) {
    public String getUrl() { return url; }
    public String getOriginalFilename() { return originalFilename; }
}
