package com.example.jira.service;

import com.example.jira.realtime.PresenceUser;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class PresenceService {

    private final Map<String, Map<String, PresenceUser>> activeByProject = new ConcurrentHashMap<>();
    private final Map<String, String> projectBySession = new ConcurrentHashMap<>();

    private final SimpMessagingTemplate messagingTemplate;
    private final ProjectMembershipService membershipService;

    public PresenceService(SimpMessagingTemplate messagingTemplate, ProjectMembershipService membershipService) {
        this.messagingTemplate = messagingTemplate;
        this.membershipService = membershipService;
    }

    public void join(String sessionId, String projectId, String userId, String userName) {
        if (!membershipService.isMember(projectId, userId)) {
            return;
        }

        activeByProject
                .computeIfAbsent(projectId, id -> new ConcurrentHashMap<>())
                .put(sessionId, new PresenceUser(sessionId, userId, userName, Instant.now()));
        projectBySession.put(sessionId, projectId);

        broadcastPresence(projectId);
    }

    public void leave(String sessionId) {
        String projectId = projectBySession.remove(sessionId);
        if (projectId == null) {
            return;
        }
        Map<String, PresenceUser> sessions = activeByProject.get(projectId);
        if (sessions != null) {
            sessions.remove(sessionId);
            if (sessions.isEmpty()) {
                activeByProject.remove(projectId);
            }
        }
        broadcastPresence(projectId);
    }

    @EventListener
    public void onSessionDisconnect(SessionDisconnectEvent event) {
        leave(event.getSessionId());
    }

    private void broadcastPresence(String projectId) {
        List<PresenceUser> users = activeByProject.getOrDefault(projectId, Map.of())
                .values().stream()
                .collect(Collectors.toList());
        messagingTemplate.convertAndSend("/topic/projects/" + projectId + "/presence", users);
    }
}