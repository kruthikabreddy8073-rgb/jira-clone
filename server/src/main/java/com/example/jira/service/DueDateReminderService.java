package com.example.jira.service;

import com.example.jira.model.Issue;
import com.example.jira.repository.IssueRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class DueDateReminderService {

    private static final String STATUS_DONE = "DONE";

    private final IssueRepository issueRepository;
    private final NotificationService notificationService;

    public DueDateReminderService(IssueRepository issueRepository, NotificationService notificationService) {
        this.issueRepository = issueRepository;
        this.notificationService = notificationService;
    }

    @Scheduled(fixedRateString = "${app.reminders.check-interval-ms:900000}")
    public void checkDueDateReminders() {
        runCheck();
    }

    public int runCheck() {
        Instant now = Instant.now();
        Instant windowStart = now;
        Instant windowEnd = now.plus(24, ChronoUnit.HOURS);

        List<Issue> candidates = issueRepository.findByDueDateIsNotNull();
        int notified = 0;

        for (Issue issue : candidates) {
            if (issue.getDueDate() == null) continue;
            if (STATUS_DONE.equals(issue.getStatus())) continue;
            if (issue.getAssigneeId() == null || issue.getAssigneeId().isBlank()) continue;

            boolean withinWindow = !issue.getDueDate().isBefore(windowStart) && !issue.getDueDate().isAfter(windowEnd);
            if (!withinWindow) continue;

            notificationService.notifyDueDateReminder(issue);
            notified++;
        }
        return notified;
    }
}