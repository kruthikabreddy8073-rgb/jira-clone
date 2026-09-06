package com.example.jira.service;

import com.example.jira.model.Issue;
import com.example.jira.model.Notification;
import com.example.jira.model.Sprint;
import com.example.jira.model.User;
import com.example.jira.repository.NotificationRepository;
import com.example.jira.repository.UserRepository;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    public static final String TYPE_TASK_ASSIGNED = "TASK_ASSIGNED";
    public static final String TYPE_STATUS_CHANGED = "STATUS_CHANGED";
    public static final String TYPE_SPRINT_STARTED = "SPRINT_STARTED";
    public static final String TYPE_SPRINT_ENDED = "SPRINT_ENDED";
    public static final String TYPE_DUE_DATE_REMINDER = "DUE_DATE_REMINDER";
    public static final String TYPE_DEPENDENCY_UNBLOCKED = "DEPENDENCY_UNBLOCKED";

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    public NotificationService(
            NotificationRepository notificationRepository,
            UserRepository userRepository,
            EmailService emailService) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
    }

    public void notify(String userId, String type, String issueId, String message, String dedupeKey) {
        if (userId == null || userId.isBlank()) {
            return;
        }
        if (dedupeKey != null && notificationRepository.existsByDedupeKey(dedupeKey)) {
            return;
        }

        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setType(type);
        notification.setIssueId(issueId);
        notification.setMessage(message);
        notification.setDedupeKey(dedupeKey);
        notificationRepository.save(notification);

        sendEmailIfEnabled(userId, type, message);
    }

    private void sendEmailIfEnabled(String userId, String type, String message) {
        User user = findUserOrNull(userId);
        if (user == null || !user.isEmailNotificationsEnabled() || user.getEmail() == null) {
            return;
        }
        String subject = "Jira Clone: " + humanizeType(type);
        emailService.send(user.getEmail(), subject, message);
    }

    private String humanizeType(String type) {
        if (type == null) return "Notification";
        return switch (type) {
            case TYPE_TASK_ASSIGNED -> "You've been assigned a task";
            case TYPE_STATUS_CHANGED -> "Task status changed";
            case TYPE_SPRINT_STARTED -> "Sprint started";
            case TYPE_SPRINT_ENDED -> "Sprint ended";
            case TYPE_DUE_DATE_REMINDER -> "Task due soon";
            case TYPE_DEPENDENCY_UNBLOCKED -> "Blocking task completed";
            default -> "Notification";
        };
    }

    public void notifyTaskAssigned(Issue issue) {
        if (issue.getAssigneeId() == null || issue.getAssigneeId().isBlank()) {
            return;
        }
        String dedupeKey = "ASSIGNED:" + issue.getId() + ":" + issue.getAssigneeId() + ":" + issue.getUpdatedAt();
        String message = "You've been assigned to \"" + issue.getTitle() + "\"";
        notify(issue.getAssigneeId(), TYPE_TASK_ASSIGNED, issue.getId(), message, dedupeKey);
    }

    public void notifyStatusChanged(Issue issue) {
        if (issue.getAssigneeId() == null || issue.getAssigneeId().isBlank()) {
            return;
        }
        String dedupeKey = "STATUS:" + issue.getId() + ":" + issue.getStatus() + ":" + issue.getUpdatedAt();
        String message = "\"" + issue.getTitle() + "\" status changed to " + issue.getStatus();
        notify(issue.getAssigneeId(), TYPE_STATUS_CHANGED, issue.getId(), message, dedupeKey);
    }

    public void notifySprintEvent(String userId, Sprint sprint, boolean started) {
        String type = started ? TYPE_SPRINT_STARTED : TYPE_SPRINT_ENDED;
        String dedupeKey = type + ":" + sprint.getId() + ":" + userId;
        String message = started
                ? "Sprint \"" + sprint.getName() + "\" has started"
                : "Sprint \"" + sprint.getName() + "\" has ended";
        notify(userId, type, null, message, dedupeKey);
    }

    public void notifyDueDateReminder(Issue issue) {
        if (issue.getAssigneeId() == null || issue.getAssigneeId().isBlank()) {
            return;
        }
        String dedupeKey = TYPE_DUE_DATE_REMINDER + ":" + issue.getId() + ":" + issue.getAssigneeId();
        String message = "\"" + issue.getTitle() + "\" is due within 24 hours";
        notify(issue.getAssigneeId(), TYPE_DUE_DATE_REMINDER, issue.getId(), message, dedupeKey);
    }

    public void notifyDependencyUnblocked(String userId, Issue completedIssue, Issue dependent, boolean nowUnblocked) {
        String dedupeKey = TYPE_DEPENDENCY_UNBLOCKED + ":" + completedIssue.getId() + ":" + dependent.getId();
        String message = nowUnblocked
                ? "Blocking task \"" + completedIssue.getTitle() + "\" is complete - \""
                        + dependent.getTitle() + "\" is now unblocked and ready to start."
                : "Blocking task \"" + completedIssue.getTitle() + "\" is complete, but \""
                        + dependent.getTitle() + "\" still has other unfinished blockers.";
        notify(userId, TYPE_DEPENDENCY_UNBLOCKED, dependent.getId(), message, dedupeKey);
    }

    private User findUserOrNull(String userId) {
        try {
            return userRepository.findById(new ObjectId(userId)).orElse(null);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}