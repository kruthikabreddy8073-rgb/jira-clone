package com.example.jira.controller;

import com.example.jira.realtime.JoinRequest;
import com.example.jira.service.PresenceService;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

@Controller
public class PresenceWebSocketController {

    private final PresenceService presenceService;

    public PresenceWebSocketController(PresenceService presenceService) {
        this.presenceService = presenceService;
    }

    @MessageMapping("/projects/{projectId}/join")
    public void join(@DestinationVariable String projectId, JoinRequest request, SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getSessionId();
        presenceService.join(sessionId, projectId, request.getUserId(), request.getUserName());
    }

    @MessageMapping("/projects/{projectId}/leave")
    public void leave(@DestinationVariable String projectId, SimpMessageHeaderAccessor headerAccessor) {
        presenceService.leave(headerAccessor.getSessionId());
    }
}