package com.example.jira.service;

import com.example.jira.exception.BadRequestException;
import com.example.jira.exception.NotFoundException;
import com.example.jira.model.AuditLogEntry;
import com.example.jira.model.Issue;
import com.example.jira.model.Project;
import com.example.jira.model.User;
import com.example.jira.model.WorkLog;
import com.example.jira.repository.AuditLogRepository;
import com.example.jira.repository.IssueRepository;
import com.example.jira.repository.Projectrepository;
import com.example.jira.repository.UserRepository;
import com.example.jira.repository.WorkLogRepository;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class WorkLogService {

    private static final String ENTITY_TYPE = "WORK_LOG";

    private final WorkLogRepository workLogRepository;
    private final AuditLogRepository auditLogRepository;
    private final IssueRepository issueRepository;
    private final Projectrepository projectRepository;
    private final UserRepository userRepository;

    public WorkLogService(
            WorkLogRepository workLogRepository,
            AuditLogRepository auditLogRepository,
            IssueRepository issueRepository,
            Projectrepository projectRepository,
            UserRepository userRepository) {
        this.workLogRepository = workLogRepository;
        this.auditLogRepository = auditLogRepository;
        this.issueRepository = issueRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
    }

    // ---------------- Create ----------------

    public WorkLog createWorkLog(String issueId, WorkLog entry, String actingUserId) {
        Issue issue = getIssueOrThrow(issueId);
        requireActingUser(actingUserId);
        validateEntry(entry);

        WorkLog log = new WorkLog();
        log.setIssueId(issue.getId());
        log.setUserId(actingUserId);
        log.setWorkDate(entry.getWorkDate());
        log.setHours(entry.getHours());
        log.setDescription(entry.getDescription());

        WorkLog saved = workLogRepository.save(log);

        recordAudit(saved.getId(), "CREATE", actingUserId,
                String.format("Logged %.2f hour(s) on %s for \"%s\"", saved.getHours(), saved.getWorkDate(), issue.getTitle()));

        return saved;
    }

    // ---------------- Read / totals ----------------

    public List<WorkLog> getLogsForIssue(String issueId) {
        getIssueOrThrow(issueId);
        return workLogRepository.findByIssueId(issueId);
    }

    public double getTotalHoursForIssue(String issueId) {
        getIssueOrThrow(issueId);
        return workLogRepository.findByIssueId(issueId).stream()
                .mapToDouble(WorkLog::getHours)
                .sum();
    }

    public double getTotalHoursForSprint(String sprintId) {
        List<String> issueIds = issueRepository.findBySprintId(sprintId).stream()
                .map(Issue::getId)
                .collect(Collectors.toList());
        if (issueIds.isEmpty()) {
            return 0.0;
        }
        return workLogRepository.findByIssueIdIn(issueIds).stream()
                .mapToDouble(WorkLog::getHours)
                .sum();
    }

    public List<AuditLogEntry> getAuditTrail(String workLogId) {
        return auditLogRepository.findByEntityTypeAndEntityIdOrderByTimestampDesc(ENTITY_TYPE, workLogId);
    }

    // ---------------- Update ----------------

    public WorkLog updateWorkLog(String workLogId, WorkLog updated, String actingUserId, boolean confirmed) {
        WorkLog log = getWorkLogOrThrow(workLogId);
        Issue issue = getIssueOrThrow(log.getIssueId());

        requireAuthorized(actingUserId, issue);
        requireConfirmation(confirmed);
        validateEntry(updated);

        String before = describe(log);

        log.setWorkDate(updated.getWorkDate());
        log.setHours(updated.getHours());
        log.setDescription(updated.getDescription());
        log.setUpdatedAt(Instant.now());

        WorkLog saved = workLogRepository.save(log);

        recordAudit(saved.getId(), "UPDATE", actingUserId,
                "Changed from [" + before + "] to [" + describe(saved) + "]");

        return saved;
    }

    // ---------------- Delete ----------------

    public void deleteWorkLog(String workLogId, String actingUserId, boolean confirmed) {
        WorkLog log = getWorkLogOrThrow(workLogId);
        Issue issue = getIssueOrThrow(log.getIssueId());

        requireAuthorized(actingUserId, issue);
        requireConfirmation(confirmed);

        String summary = describe(log);
        workLogRepository.deleteById(new ObjectId(workLogId));

        recordAudit(workLogId, "DELETE", actingUserId, "Deleted entry [" + summary + "]");
    }

    // ---------------- Validation ----------------

    private void validateEntry(WorkLog entry) {
        if (entry.getWorkDate() == null) {
            throw new BadRequestException("A work log must include a date");
        }
        if (entry.getWorkDate().isAfter(LocalDate.now())) {
            throw new BadRequestException("Cannot log time for a future date");
        }
        if (entry.getHours() <= 0) {
            throw new BadRequestException("Logged time must be a positive number of hours");
        }
        if (entry.getDescription() == null || entry.getDescription().isBlank()) {
            throw new BadRequestException("A work log must include a description of the work performed");
        }
    }

    private void requireConfirmation(boolean confirmed) {
        if (!confirmed) {
            throw new BadRequestException("This action requires confirmation - resubmit with confirmed=true");
        }
    }

    private void requireAuthorized(String actingUserId, Issue issue) {
        requireActingUser(actingUserId);

        if (actingUserId.equals(issue.getAssigneeId())) {
            return;
        }
        if (isProjectManager(actingUserId, issue.getProjectId())) {
            return;
        }
        throw new BadRequestException("Only the task assignee or a Project Manager can modify this time entry");
    }

    private boolean isProjectManager(String userId, String projectId) {
        Project project = projectId != null
                ? projectRepository.findById(new ObjectId(projectId)).orElse(null)
                : null;
        if (project != null && userId.equals(project.getOwnerId())) {
            return true;
        }
        User user = findUserOrNull(userId);
        if (user == null || user.getRole() == null) {
            return false;
        }
        String role = user.getRole().trim().toUpperCase();
        return role.equals("PM") || role.equals("PROJECT_MANAGER") || role.equals("MANAGER");
    }

    private void requireActingUser(String actingUserId) {
        if (actingUserId == null || actingUserId.isBlank()) {
            throw new BadRequestException("actingUserId is required for this operation");
        }
    }

    // ---------------- Helpers ----------------

    private String describe(WorkLog log) {
        return String.format("%.2fh on %s: %s", log.getHours(), log.getWorkDate(), log.getDescription());
    }

    private void recordAudit(String entityId, String action, String actingUserId, String details) {
        AuditLogEntry entry = new AuditLogEntry();
        entry.setEntityType(ENTITY_TYPE);
        entry.setEntityId(entityId);
        entry.setAction(action);
        entry.setPerformedByUserId(actingUserId);
        entry.setDetails(details);
        auditLogRepository.save(entry);
    }

    private Issue getIssueOrThrow(String id) {
        try {
            return issueRepository.findById(new ObjectId(id))
                    .orElseThrow(() -> new NotFoundException("Issue not found: " + id));
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid issue id: " + id);
        }
    }

    private WorkLog getWorkLogOrThrow(String id) {
        try {
            return workLogRepository.findById(new ObjectId(id))
                    .orElseThrow(() -> new NotFoundException("Work log not found: " + id));
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid work log id: " + id);
        }
    }

    private User findUserOrNull(String id) {
        try {
            return userRepository.findById(new ObjectId(id)).orElse(null);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}