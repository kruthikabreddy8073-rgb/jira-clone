package com.example.jira.controller;

import com.example.jira.model.Notification;
import com.example.jira.repository.NotificationRepository;
import com.example.jira.service.DueDateReminderService;
import org.bson.types.ObjectId;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final DueDateReminderService dueDateReminderService;

    public NotificationController(
            NotificationRepository notificationRepository,
            DueDateReminderService dueDateReminderService) {
        this.notificationRepository = notificationRepository;
        this.dueDateReminderService = dueDateReminderService;
    }

    @GetMapping("/user/{userId}")
    public List<Notification> getForUser(@PathVariable String userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @GetMapping("/user/{userId}/unread")
    public List<Notification> getUnreadForUser(@PathVariable String userId) {
        return notificationRepository.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId);
    }

    @PutMapping("/{id}/read")
    public Notification markRead(@PathVariable String id) {
        Notification notification = notificationRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        notification.setRead(true);
        return notificationRepository.save(notification);
    }

    @PostMapping("/run-due-date-check")
    public Map<String, Integer> runDueDateCheck() {
        int notified = dueDateReminderService.runCheck();
        return Map.of("notificationsCreated", notified);
    }
}