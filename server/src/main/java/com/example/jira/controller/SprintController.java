package com.example.jira.controller;
import org.springframework.web.bind.annotation.CrossOrigin;
import com.example.jira.model.Issue;
import com.example.jira.model.Project;
import com.example.jira.model.Sprint;
import com.example.jira.repository.IssueRepository;
import com.example.jira.repository.Projectrepository;
import com.example.jira.repository.SprintRepository;
import com.example.jira.service.NotificationService;
import com.example.jira.service.RealtimeEventPublisher;
import org.bson.types.ObjectId;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/sprints")
public class SprintController {

    private final SprintRepository sprintRepository;
    private final IssueRepository issueRepository;
    private final Projectrepository projectRepository;
    private final RealtimeEventPublisher realtimeEventPublisher;
    private final NotificationService notificationService;

    public SprintController(
            SprintRepository sprintRepository,
            IssueRepository issueRepository,
            Projectrepository projectRepository,
            RealtimeEventPublisher realtimeEventPublisher,
            NotificationService notificationService) {
        this.sprintRepository = sprintRepository;
        this.issueRepository = issueRepository;
        this.projectRepository = projectRepository;
        this.realtimeEventPublisher = realtimeEventPublisher;
        this.notificationService = notificationService;
    }

    // =========================
    // CREATE SPRINT
    // =========================
    @PostMapping
    public Sprint createSprint(@RequestBody Sprint sprint) {
        sprint.setStatus("PLANNED");
        return sprintRepository.save(sprint);
    }

    // =========================
    // GET SPRINTS BY PROJECT
    // =========================
    @GetMapping("/project/{projectId}")
    public List<Sprint> getSprintsByProject(@PathVariable String projectId) {
        return sprintRepository.findByProjectId(projectId);
    }

    // =========================
    // START SPRINT
    // =========================
    @PutMapping("/{id}/start")
    public Sprint startSprint(@PathVariable String id) {

        Sprint sprint = sprintRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Sprint not found"));

        sprint.setStatus("ACTIVE");
        sprint.setStartDate(Instant.now());

        Sprint saved = sprintRepository.save(sprint);
        notifyProjectMembers(saved, true);
        return saved;
    }

    // =========================
    // COMPLETE SPRINT
    // =========================
    @PutMapping("/{id}/complete")
    public Sprint completeSprint(@PathVariable String id) {

        Sprint sprint = sprintRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Sprint not found"));

        sprint.setStatus("COMPLETED");
        sprint.setEndDate(Instant.now());

        Sprint saved = sprintRepository.save(sprint);
        notifyProjectMembers(saved, false);
        return saved;
    }

    private void notifyProjectMembers(Sprint sprint, boolean started) {
        if (sprint.getProjectId() == null) return;
        Project project;
        try {
            project = projectRepository.findById(new ObjectId(sprint.getProjectId())).orElse(null);
        } catch (IllegalArgumentException e) {
            return;
        }
        if (project == null) return;

        Set<String> memberIds = new HashSet<>();
        if (project.getOwnerId() != null) memberIds.add(project.getOwnerId());
        if (project.getMemberIds() != null) memberIds.addAll(project.getMemberIds());

        for (String memberId : memberIds) {
            notificationService.notifySprintEvent(memberId, sprint, started);
        }
    }

    // =========================
    // UPDATE SPRINT DETAILS
    // =========================
    @PutMapping("/{id}")
    public Sprint updateSprint(
            @PathVariable String id,
            @RequestBody Sprint updated) {

        Sprint sprint = sprintRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Sprint not found"));

        sprint.setName(updated.getName());
        sprint.setGoal(updated.getGoal());
        sprint.setStartDate(updated.getStartDate());
        sprint.setEndDate(updated.getEndDate());

        return sprintRepository.save(sprint);
    }

    // =========================
    // DELETE SPRINT
    // =========================
    @DeleteMapping("/{id}")
    public void deleteSprint(@PathVariable String id) {
        sprintRepository.deleteById(new ObjectId(id));
    }

    // =========================
    // ASSIGN ISSUE TO SPRINT
    // =========================
    @PutMapping("/{sprintId}/issues/{issueId}")
    public Issue addIssueToSprint(
            @PathVariable String sprintId,
            @PathVariable String issueId) {

        Issue issue = issueRepository.findById(new ObjectId(issueId))
                .orElseThrow(() -> new RuntimeException("Issue not found"));

        issue.setSprintId(sprintId);
        issue.setUpdatedAt(Instant.now());
        Issue saved = issueRepository.save(issue);
        realtimeEventPublisher.publish(saved.getProjectId(), "ISSUE_UPDATED", saved, saved.getId());

        for (Issue subtask : issueRepository.findByParentId(issueId)) {
            subtask.setSprintId(sprintId);
            subtask.setUpdatedAt(Instant.now());
            Issue savedSubtask = issueRepository.save(subtask);
            realtimeEventPublisher.publish(savedSubtask.getProjectId(), "ISSUE_UPDATED", savedSubtask, savedSubtask.getId());
        }

        return saved;
    }
}