package com.example.jira.service;

import com.example.jira.model.Issue;
import com.example.jira.realtime.RealtimeEvent;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Service
public class RealtimeEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public RealtimeEventPublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void publish(String projectId, String type, Issue issue, String issueId) {
        if (projectId == null || projectId.isBlank()) {
            return;
        }
        RealtimeEvent event = new RealtimeEvent();
        event.setEventId(UUID.randomUUID().toString());
        event.setType(type);
        event.setProjectId(projectId);
        event.setIssue(issue);
        event.setIssueId(issueId);
        event.setTimestamp(Instant.now());

        messagingTemplate.convertAndSend("/topic/projects/" + projectId, event);
    }
}