package com.example.jira.service;

import com.example.jira.exception.BadRequestException;
import com.example.jira.exception.ConflictException;
import com.example.jira.exception.NotFoundException;
import com.example.jira.model.Issue;
import com.example.jira.repository.IssueRepository;
import org.bson.types.ObjectId;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class IssueService {

    private static final String STATUS_TODO = "TODO";
    private static final String STATUS_DONE = "DONE";

    private static final String EVENT_ISSUE_CREATED = "ISSUE_CREATED";
    private static final String EVENT_ISSUE_UPDATED = "ISSUE_UPDATED";
    private static final String EVENT_STATUS_CHANGED = "ISSUE_STATUS_CHANGED";
    private static final String EVENT_COMMENT_ADDED = "COMMENT_ADDED";
    private static final String EVENT_ISSUE_DELETED = "ISSUE_DELETED";
    private final IssueRepository issueRepository;
    private final NotificationService notificationService;
    private final RealtimeEventPublisher realtimeEventPublisher;
    private final AttachmentService attachmentService;

    public IssueService(
            IssueRepository issueRepository,
            NotificationService notificationService,
            RealtimeEventPublisher realtimeEventPublisher,
            AttachmentService attachmentService) {
        this.issueRepository = issueRepository;
        this.notificationService = notificationService;
        this.realtimeEventPublisher = realtimeEventPublisher;
        this.attachmentService = attachmentService;
    }
    public Issue createIssue(Issue issue) {
        if (issue.isSubtask()) {
            return createSubtask(issue.getParentId(), issue);
        }
        issue.setId(null);
        if (issue.getStatus() == null || issue.getStatus().isBlank()) {
            issue.setStatus(STATUS_TODO);
        }
        if (issue.getDependencyIds() == null) {
            issue.setDependencyIds(new ArrayList<>());
        }
        Issue saved = issueRepository.save(issue);
        realtimeEventPublisher.publish(saved.getProjectId(), EVENT_ISSUE_CREATED, saved, saved.getId());
        notificationService.notifyTaskAssigned(saved);
        return saved;
    }

    public Issue createSubtask(String parentId, Issue subtask) {
        Issue parent = getIssueOrThrow(parentId);
        if (parent.isSubtask()) {
            throw new BadRequestException("\"" + parent.getTitle() + "\" is itself a subtask - subtasks cannot be nested");
        }

        subtask.setId(null);
        subtask.setParentId(parent.getId());
        subtask.setProjectId(parent.getProjectId());
        subtask.setSprintId(parent.getSprintId());
        if (subtask.getStatus() == null || subtask.getStatus().isBlank()) {
            subtask.setStatus(STATUS_TODO);
        }
        if (subtask.getDependencyIds() == null) {
            subtask.setDependencyIds(new ArrayList<>());
        }
        Issue saved = issueRepository.save(subtask);
        realtimeEventPublisher.publish(saved.getProjectId(), EVENT_ISSUE_CREATED, saved, saved.getId());
        notificationService.notifyTaskAssigned(saved);
        return saved;
    }

    public List<Issue> getSubtasks(String parentId) {
        getIssueOrThrow(parentId);
        return issueRepository.findByParentId(parentId);
    }

    public Issue updateIssue(String id, Issue updated) {
        Issue issue = getIssueOrThrow(id);

        String newStatus = (updated.getStatus() != null && !updated.getStatus().isBlank())
                ? updated.getStatus()
                : issue.getStatus();

        if (STATUS_DONE.equals(newStatus)) {
            List<Issue> subtasks = issueRepository.findByParentId(id);
            List<String> incomplete = subtasks.stream()
                    .filter(s -> !STATUS_DONE.equals(s.getStatus()))
                    .map(Issue::getTitle)
                    .collect(Collectors.toList());
            if (!incomplete.isEmpty()) {
                throw new BadRequestException(
                        "Cannot mark \"" + issue.getTitle() + "\" as Done - the following subtasks are not complete: "
                                + String.join(", ", incomplete));
            }
        }

        if (!STATUS_TODO.equals(newStatus) && issue.getDependencyIds() != null && !issue.getDependencyIds().isEmpty()) {
            List<String> incomplete = issue.getDependencyIds().stream()
                    .map(this::findByIdOrNull)
                    .filter(dep -> dep != null && !STATUS_DONE.equals(dep.getStatus()))
                    .map(Issue::getTitle)
                    .collect(Collectors.toList());
            if (!incomplete.isEmpty()) {
                throw new BadRequestException(
                        "\"" + issue.getTitle() + "\" cannot start - blocked by incomplete task(s): "
                                + String.join(", ", incomplete));
            }
        }

        String oldStatus = issue.getStatus();
        String oldTitle = issue.getTitle();
        String oldDescription = issue.getDescription();
        String oldPriority = issue.getPriority();
        String oldAssigneeId = issue.getAssigneeId();
        int oldCommentCount = issue.getComments() == null ? 0 : issue.getComments().size();

        boolean justCompleted = STATUS_DONE.equals(newStatus) && !STATUS_DONE.equals(issue.getStatus());

        issue.setTitle(updated.getTitle());
        issue.setDescription(updated.getDescription());
        issue.setStatus(newStatus);
        issue.setPriority(updated.getPriority());
        issue.setAssigneeId(updated.getAssigneeId());
        issue.setOrder(updated.getOrder());
        issue.setComments(updated.getComments());
        issue.setDueDate(updated.getDueDate());
        issue.setUpdatedAt(Instant.now());

        if (issue.isSubtask()) {
            Issue parent = getIssueOrThrow(issue.getParentId());
            issue.setProjectId(parent.getProjectId());
            issue.setSprintId(parent.getSprintId());
        } else {
            if (updated.getProjectId() != null) issue.setProjectId(updated.getProjectId());
            if (updated.getSprintId() != null) issue.setSprintId(updated.getSprintId());
        }

        Issue saved;
        try {
            saved = issueRepository.save(issue);
        } catch (OptimisticLockingFailureException e) {
            throw new ConflictException(
                    "\"" + issue.getTitle() + "\" was changed by someone else while you were editing it. "
                            + "Please refresh and try again.");
        }

        if (justCompleted) {
            notifyDependents(saved);
        }

        boolean statusChanged = !Objects.equals(oldStatus, saved.getStatus());
        boolean assigneeChanged = !Objects.equals(oldAssigneeId, saved.getAssigneeId());
        int newCommentCount = saved.getComments() == null ? 0 : saved.getComments().size();
        boolean commentAdded = newCommentCount > oldCommentCount;
        boolean otherFieldsChanged = !Objects.equals(oldTitle, saved.getTitle())
                || !Objects.equals(oldDescription, saved.getDescription())
                || !Objects.equals(oldPriority, saved.getPriority())
                || assigneeChanged;

        if (statusChanged) {
            realtimeEventPublisher.publish(saved.getProjectId(), EVENT_STATUS_CHANGED, saved, saved.getId());
        } else if (commentAdded) {
            realtimeEventPublisher.publish(saved.getProjectId(), EVENT_COMMENT_ADDED, saved, saved.getId());
        } else if (otherFieldsChanged) {
            realtimeEventPublisher.publish(saved.getProjectId(), EVENT_ISSUE_UPDATED, saved, saved.getId());
        }

        if (assigneeChanged && saved.getAssigneeId() != null) {
            notificationService.notifyTaskAssigned(saved);
        }
        if (statusChanged) {
            notificationService.notifyStatusChanged(saved);
        }

        return saved;
    }

    private void notifyDependents(Issue completedIssue) {
        List<Issue> dependents = issueRepository.findByDependencyIdsContaining(completedIssue.getId());
        for (Issue dependent : dependents) {
            if (dependent.getAssigneeId() == null || dependent.getAssigneeId().isBlank()) {
                continue;
            }
            boolean nowUnblocked = dependent.getDependencyIds().stream()
                    .allMatch(depId -> depId.equals(completedIssue.getId())
                            || (findByIdOrNull(depId) != null && STATUS_DONE.equals(findByIdOrNull(depId).getStatus())));

            notificationService.notifyDependencyUnblocked(dependent.getAssigneeId(), completedIssue, dependent, nowUnblocked);
        }
    }

    public Issue addDependency(String issueId, String blockingIssueId) {
        if (issueId.equals(blockingIssueId)) {
            throw new BadRequestException("A task cannot depend on itself");
        }
        Issue issue = getIssueOrThrow(issueId);
        Issue blocker = getIssueOrThrow(blockingIssueId);

        if (issue.getDependencyIds() == null) {
            issue.setDependencyIds(new ArrayList<>());
        }
        if (issue.getDependencyIds().contains(blockingIssueId)) {
            return issue;
        }
        if (wouldCreateCycle(issueId, blockingIssueId)) {
            throw new BadRequestException(
                    "Adding \"" + blocker.getTitle() + "\" as a blocker for \"" + issue.getTitle()
                            + "\" would create a circular dependency");
        }

        issue.getDependencyIds().add(blockingIssueId);
        issue.setUpdatedAt(Instant.now());
        Issue saved = issueRepository.save(issue);
        realtimeEventPublisher.publish(saved.getProjectId(), EVENT_ISSUE_UPDATED, saved, saved.getId());
        return saved;
    }

    public Issue removeDependency(String issueId, String blockingIssueId) {
        Issue issue = getIssueOrThrow(issueId);
        if (issue.getDependencyIds() != null) {
            issue.getDependencyIds().remove(blockingIssueId);
        }
        issue.setUpdatedAt(Instant.now());
        Issue saved = issueRepository.save(issue);
        realtimeEventPublisher.publish(saved.getProjectId(), EVENT_ISSUE_UPDATED, saved, saved.getId());
        return saved;
    }

    public List<Issue> getDependencies(String issueId) {
        Issue issue = getIssueOrThrow(issueId);
        if (issue.getDependencyIds() == null || issue.getDependencyIds().isEmpty()) {
            return List.of();
        }
        return issue.getDependencyIds().stream()
                .map(this::findByIdOrNull)
                .filter(i -> i != null)
                .collect(Collectors.toList());
    }

    public List<Issue> getBlockedDependents(String issueId) {
        getIssueOrThrow(issueId);
        return issueRepository.findByDependencyIdsContaining(issueId);
    }

    private boolean wouldCreateCycle(String from, String to) {
        Set<String> visited = new HashSet<>();
        Deque<String> stack = new ArrayDeque<>();
        stack.push(to);

        while (!stack.isEmpty()) {
            String current = stack.pop();
            if (current.equals(from)) {
                return true;
            }
            if (!visited.add(current)) {
                continue;
            }
            Issue currentIssue = findByIdOrNull(current);
            if (currentIssue == null || currentIssue.getDependencyIds() == null) {
                continue;
            }
            for (String next : currentIssue.getDependencyIds()) {
                stack.push(next);
            }
        }
        return false;
    }

    public void deleteIssue(String id) {
        Issue issue = getIssueOrThrow(id);

        List<Issue> subtasks = issueRepository.findByParentId(id);
        if (!subtasks.isEmpty()) {
            throw new BadRequestException("Cannot delete a task that still has subtasks - delete or reassign the subtasks first");
        }

        List<Issue> dependents = issueRepository.findByDependencyIdsContaining(id);
        for (Issue dependent : dependents) {
            dependent.getDependencyIds().remove(id);
            issueRepository.save(dependent);
        }

        String projectId = issue.getProjectId();
        issueRepository.deleteById(new ObjectId(id));
        realtimeEventPublisher.publish(projectId, EVENT_ISSUE_DELETED, null, id);
    }

    private Issue getIssueOrThrow(String id) {
        try {
            return issueRepository.findById(new ObjectId(id))
                    .orElseThrow(() -> new NotFoundException("Issue not found: " + id));
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid issue id: " + id);
        }
    }

    private Issue findByIdOrNull(String id) {
        try {
            return issueRepository.findById(new ObjectId(id)).orElse(null);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}