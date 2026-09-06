package com.example.jira.config;

import com.example.jira.repository.UserRepository;
import com.example.jira.service.ProjectMembershipService;
import org.bson.types.ObjectId;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

    private final UserRepository userRepository;
    private final ProjectMembershipService membershipService;

    public WebSocketAuthChannelInterceptor(UserRepository userRepository, ProjectMembershipService membershipService) {
        this.userRepository = userRepository;
        this.membershipService = membershipService;
    }

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        StompCommand command = accessor.getCommand();

        if (StompCommand.CONNECT.equals(command)) {
            handleConnect(accessor);
        } else if (StompCommand.SUBSCRIBE.equals(command)) {
            handleSubscribe(accessor);
        }

        return message;
    }

    private void handleConnect(StompHeaderAccessor accessor) {
        String userId = accessor.getFirstNativeHeader("userId");
        if (userId == null || userId.isBlank() || !isRealUser(userId)) {
            throw new MessagingException("Unauthorized: a valid userId is required to connect");
        }

        Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
        if (sessionAttributes == null) {
            sessionAttributes = new HashMap<>();
            accessor.setSessionAttributes(sessionAttributes);
        }
        sessionAttributes.put("userId", userId);
    }

    private void handleSubscribe(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null || !destination.startsWith("/topic/projects/")) {
            return;
        }

        String projectId = extractProjectId(destination);
        Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
        String userId = sessionAttributes != null ? (String) sessionAttributes.get("userId") : null;

        if (userId == null || !membershipService.isMember(projectId, userId)) {
            throw new MessagingException(
                    "Unauthorized: not a member of project " + projectId);
        }
    }

    private String extractProjectId(String destination) {
        String[] parts = destination.split("/");
        return parts.length >= 4 ? parts[3] : null;
    }

    private boolean isRealUser(String userId) {
        try {
            return userRepository.findById(new ObjectId(userId)).isPresent();
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}