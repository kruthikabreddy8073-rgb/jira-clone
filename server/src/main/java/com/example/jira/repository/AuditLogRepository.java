package com.example.jira.repository;

import com.example.jira.model.AuditLogEntry;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface AuditLogRepository extends MongoRepository<AuditLogEntry, ObjectId> {

    List<AuditLogEntry> findByEntityTypeAndEntityIdOrderByTimestampDesc(String entityType, String entityId);
}