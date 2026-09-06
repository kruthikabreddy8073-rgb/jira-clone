package com.example.jira.model;

import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "attachments")
public class Attachment {

    @Id
    private ObjectId id;

    private String issueId;
    private String projectId;
    private String originalFileName;
    private String storedFileName;
    private String contentType;
    private long fileSize;
    private String uploadedByUserId;
    private Instant uploadedAt = Instant.now();

    public String getId() {
        return id != null ? id.toHexString() : null;
    }

    public void setId(ObjectId id) {
        this.id = id;
    }

    public String getIssueId() { return issueId; }
    public void setIssueId(String issueId) { this.issueId = issueId; }

    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }

    public String getOriginalFileName() { return originalFileName; }
    public void setOriginalFileName(String originalFileName) { this.originalFileName = originalFileName; }

    public String getStoredFileName() { return storedFileName; }
    public void setStoredFileName(String storedFileName) { this.storedFileName = storedFileName; }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }

    public long getFileSize() { return fileSize; }
    public void setFileSize(long fileSize) { this.fileSize = fileSize; }

    public String getUploadedByUserId() { return uploadedByUserId; }
    public void setUploadedByUserId(String uploadedByUserId) { this.uploadedByUserId = uploadedByUserId; }

    public Instant getUploadedAt() { return uploadedAt; }
}