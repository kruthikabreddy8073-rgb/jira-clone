package com.example.jira.model;

import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "audit_logs")
public class AuditLogEntry {

    @Id
    private ObjectId id;

    private String entityType;      // e.g. "WORK_LOG"
    private String entityId;        // the work log's id
    private String action;          // "CREATE" | "UPDATE" | "DELETE"
    private String performedByUserId;
    private String details;         // human-readable summary of what changed
    private Instant timestamp = Instant.now();

    public String getId() {
        return id != null ? id.toHexString() : null;
    }

    public void setId(ObjectId id) {
        this.id = id;
    }

    public String getEntityType() { return entityType; }
    public void setEntityType(String entityType) { this.entityType = entityType; }

    public String getEntityId() { return entityId; }
    public void setEntityId(String entityId) { this.entityId = entityId; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getPerformedByUserId() { return performedByUserId; }
    public void setPerformedByUserId(String performedByUserId) { this.performedByUserId = performedByUserId; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }

    public Instant getTimestamp() { return timestamp; }
}