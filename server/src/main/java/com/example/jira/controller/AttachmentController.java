package com.example.jira.controller;

import com.example.jira.model.Attachment;
import com.example.jira.service.AttachmentService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;

@CrossOrigin(origins = "*")
@RestController
public class AttachmentController {

    private final AttachmentService attachmentService;

    public AttachmentController(AttachmentService attachmentService) {
        this.attachmentService = attachmentService;
    }

    @PostMapping(value = "/api/issues/{issueId}/attachments", consumes = "multipart/form-data")
    public Attachment upload(
            @PathVariable String issueId,
            @RequestParam String actingUserId,
            @RequestParam("file") MultipartFile file) {
        return attachmentService.upload(issueId, actingUserId, file);
    }

    @GetMapping("/api/issues/{issueId}/attachments")
    public List<Attachment> list(
            @PathVariable String issueId,
            @RequestParam String actingUserId) {
        return attachmentService.listForIssue(issueId, actingUserId);
    }

    @GetMapping("/api/attachments/{id}/download")
    public ResponseEntity<org.springframework.core.io.Resource> download(
            @PathVariable String id,
            @RequestParam String actingUserId) {
        AttachmentService.AttachmentDownload download = attachmentService.download(id, actingUserId);
        Attachment attachment = download.getAttachment();

        String encodedName = java.net.URLEncoder.encode(attachment.getOriginalFileName(), StandardCharsets.UTF_8)
                .replace("+", "%20");

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(attachment.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + encodedName)
                .body(download.getResource());
    }

    @DeleteMapping("/api/attachments/{id}")
    public void delete(
            @PathVariable String id,
            @RequestParam String actingUserId) {
        attachmentService.delete(id, actingUserId);
    }
}