package com.example.jira.service;

import com.example.jira.model.Project;
import com.example.jira.repository.Projectrepository;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

@Service
public class ProjectMembershipService {

    private final Projectrepository projectRepository;

    public ProjectMembershipService(Projectrepository projectRepository) {
        this.projectRepository = projectRepository;
    }

    public boolean isMember(String projectId, String userId) {
        if (projectId == null || userId == null) {
            return false;
        }
        Project project;
        try {
            project = projectRepository.findById(new ObjectId(projectId)).orElse(null);
        } catch (IllegalArgumentException e) {
            return false;
        }
        if (project == null) {
            return false;
        }
        // Owner is always a member
        if (userId.equals(project.getOwnerId())) {
            return true;
        }
        // Check if in members list (handle null memberIds for old projects)
        if (project.getMemberIds() != null && !project.getMemberIds().isEmpty()) {
            return project.getMemberIds().contains(userId);
        }
        // For projects created before memberIds was initialized, only owner is member
        return false;
    }
}