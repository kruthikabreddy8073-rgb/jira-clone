package com.example.jira.service;

import com.example.jira.exception.BadRequestException;
import com.example.jira.exception.ForbiddenException;
import com.example.jira.exception.NotFoundException;
import com.example.jira.model.Attachment;
import com.example.jira.model.Issue;
import com.example.jira.repository.AttachmentRepository;
import com.example.jira.repository.IssueRepository;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AttachmentService {

    private static final long MAX_ATTACHMENT_BYTES = 10L * 1024 * 1024; // 10MB

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("pdf", "png", "jpg", "jpeg", "docx");

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "application/pdf",
            "image/png",
            "image/jpeg",
            "image/jpg",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    private final AttachmentRepository attachmentRepository;
    private final IssueRepository issueRepository;
    private final ProjectMembershipService membershipService;
    private final String uploadDir;

    public AttachmentService(
            AttachmentRepository attachmentRepository,
            IssueRepository issueRepository,
            ProjectMembershipService membershipService,
            @Value("${app.attachments.dir:uploads/attachments}") String uploadDir) {
        this.attachmentRepository = attachmentRepository;
        this.issueRepository = issueRepository;
        this.membershipService = membershipService;
        this.uploadDir = uploadDir;
    }

    public Attachment upload(String issueId, String actingUserId, MultipartFile file) {
        Issue issue = getIssueOrThrow(issueId);
        requireAttachmentAccess(issue, actingUserId);

        if (file == null || file.isEmpty()) {
            throw new BadRequestException("No file was uploaded");
        }
        if (file.getSize() > MAX_ATTACHMENT_BYTES) {
            throw new BadRequestException("File exceeds the maximum allowed size of 10MB");
        }

        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
        String extension = extractExtension(originalName);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new BadRequestException("Unsupported file type - only PDF, PNG, JPG, and DOCX are allowed");
        }

        String contentType = file.getContentType();
        boolean contentTypeOk = contentType != null && ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase());
        boolean octetStreamFallback = "application/octet-stream".equalsIgnoreCase(contentType)
                && ("docx".equals(extension) || "pdf".equals(extension));
        if (!contentTypeOk && !octetStreamFallback) {
            throw new BadRequestException("Unsupported file type - only PDF, PNG, JPG, and DOCX are allowed");
        }

        try {
            Path dir = Paths.get(uploadDir);
            Files.createDirectories(dir);

            String storedFileName = UUID.randomUUID() + "." + extension;
            Path destination = dir.resolve(storedFileName);
            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);

            Attachment attachment = new Attachment();
            attachment.setIssueId(issueId);
            attachment.setProjectId(issue.getProjectId());
            attachment.setOriginalFileName(originalName);
            attachment.setStoredFileName(storedFileName);
            attachment.setContentType(contentType != null ? contentType : "application/octet-stream");
            attachment.setFileSize(file.getSize());
            attachment.setUploadedByUserId(actingUserId);

            return attachmentRepository.save(attachment);
        } catch (IOException e) {
            throw new BadRequestException("Failed to store the uploaded file");
        }
    }

    public List<Attachment> listForIssue(String issueId, String actingUserId) {
        Issue issue = getIssueOrThrow(issueId);
        requireAttachmentAccess(issue, actingUserId);
        return attachmentRepository.findByIssueId(issueId);
    }

    public AttachmentDownload download(String attachmentId, String actingUserId) {
        Attachment attachment = getAttachmentOrThrow(attachmentId);
        Issue issue = getIssueOrThrow(attachment.getIssueId());
        requireAttachmentAccess(issue, actingUserId);

        Path file = Paths.get(uploadDir).resolve(attachment.getStoredFileName());
        if (!Files.exists(file)) {
            throw new NotFoundException("The stored file could not be found");
        }

        Resource resource = new FileSystemResource(file);
        return new AttachmentDownload(attachment, resource);
    }

    public void delete(String attachmentId, String actingUserId) {
        Attachment attachment = getAttachmentOrThrow(attachmentId);
        Issue issue = getIssueOrThrow(attachment.getIssueId());
        requireAttachmentAccess(issue, actingUserId);

        deleteFileQuietly(attachment.getStoredFileName());
        attachmentRepository.deleteById(new ObjectId(attachmentId));
    }

    public void deleteAllForIssue(String issueId) {
        List<Attachment> attachments = attachmentRepository.findByIssueId(issueId);
        for (Attachment attachment : attachments) {
            deleteFileQuietly(attachment.getStoredFileName());
        }
        List<ObjectId> ids = attachments.stream()
                .map(Attachment::getId)
                .filter(id -> id != null)
                .map(ObjectId::new)
                .collect(Collectors.toList());
        if (!ids.isEmpty()) {
            attachmentRepository.deleteAllById(ids);
        }
    }

    private void deleteFileQuietly(String storedFileName) {
        if (storedFileName == null || storedFileName.contains("..") || storedFileName.contains("/")) {
            return;
        }
        try {
            Files.deleteIfExists(Paths.get(uploadDir).resolve(storedFileName));
        } catch (IOException e) {
            // Non-fatal - the database record is still removed either way.
        }
    }

    private void requireProjectMember(String projectId, String actingUserId) {
        if (actingUserId == null || actingUserId.isBlank()) {
            throw new BadRequestException("actingUserId is required for this operation");
        }
        if (!membershipService.isMember(projectId, actingUserId)) {
            throw new ForbiddenException("Only project members can view, download, or manage this attachment");
        }
    }

    private void requireAttachmentAccess(Issue issue, String actingUserId) {
        if (actingUserId == null || actingUserId.isBlank()) {
            throw new BadRequestException("actingUserId is required for this operation");
        }
        // Allow if user is the issue reporter
        if (actingUserId.equals(issue.getReporterId())) {
            return;
        }
        // Allow if user is the assignee
        if (actingUserId.equals(issue.getAssigneeId())) {
            return;
        }
        // Allow if user is a project member
        if (membershipService.isMember(issue.getProjectId(), actingUserId)) {
            return;
        }
        throw new ForbiddenException("You don't have permission to access attachments for this issue");
    }

    private String extractExtension(String fileName) {
        int dot = fileName.lastIndexOf('.');
        if (dot < 0 || dot == fileName.length() - 1) {
            return "";
        }
        return fileName.substring(dot + 1).toLowerCase();
    }

    private Issue getIssueOrThrow(String id) {
        try {
            return issueRepository.findById(new ObjectId(id))
                    .orElseThrow(() -> new NotFoundException("Issue not found: " + id));
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid issue id: " + id);
        }
    }

    private Attachment getAttachmentOrThrow(String id) {
        try {
            return attachmentRepository.findById(new ObjectId(id))
                    .orElseThrow(() -> new NotFoundException("Attachment not found: " + id));
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid attachment id: " + id);
        }
    }

    public static class AttachmentDownload {
        private final Attachment attachment;
        private final Resource resource;

        public AttachmentDownload(Attachment attachment, Resource resource) {
            this.attachment = attachment;
            this.resource = resource;
        }

        public Attachment getAttachment() { return attachment; }
        public Resource getResource() { return resource; }
    }
}