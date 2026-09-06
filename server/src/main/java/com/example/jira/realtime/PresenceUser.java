package com.example.jira.realtime;

import java.time.Instant;

public class PresenceUser {

    private String sessionId;
    private String userId;
    private String userName;
    private Instant joinedAt;

    public PresenceUser(String sessionId, String userId, String userName, Instant joinedAt) {
        this.sessionId = sessionId;
        this.userId = userId;
        this.userName = userName;
        this.joinedAt = joinedAt;
    }

    public String getSessionId() { return sessionId; }
    public String getUserId() { return userId; }
    public String getUserName() { return userName; }
    public Instant getJoinedAt() { return joinedAt; }
}