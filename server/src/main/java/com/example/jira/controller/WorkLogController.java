package com.example.jira.controller;

import com.example.jira.model.AuditLogEntry;
import com.example.jira.model.WorkLog;
import com.example.jira.service.WorkLogService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
public class WorkLogController {

    private final WorkLogService workLogService;

    public WorkLogController(WorkLogService workLogService) {
        this.workLogService = workLogService;
    }

    @PostMapping("/api/issues/{issueId}/worklogs")
    public WorkLog createWorkLog(
            @PathVariable String issueId,
            @RequestParam String actingUserId,
            @RequestBody WorkLog entry) {
        return workLogService.createWorkLog(issueId, entry, actingUserId);
    }

    @GetMapping("/api/issues/{issueId}/worklogs")
    public List<WorkLog> getWorkLogsForIssue(@PathVariable String issueId) {
        return workLogService.getLogsForIssue(issueId);
    }

    @GetMapping("/api/issues/{issueId}/worklogs/total")
    public Map<String, Object> getTotalHoursForIssue(@PathVariable String issueId) {
        return Map.of("issueId", issueId, "totalHours", workLogService.getTotalHoursForIssue(issueId));
    }

    @GetMapping("/api/sprints/{sprintId}/worklogs/total")
    public Map<String, Object> getTotalHoursForSprint(@PathVariable String sprintId) {
        return Map.of("sprintId", sprintId, "totalHours", workLogService.getTotalHoursForSprint(sprintId));
    }

    @PutMapping("/api/worklogs/{id}")
    public WorkLog updateWorkLog(
            @PathVariable String id,
            @RequestParam String actingUserId,
            @RequestParam(defaultValue = "false") boolean confirmed,
            @RequestBody WorkLog updated) {
        return workLogService.updateWorkLog(id, updated, actingUserId, confirmed);
    }

    @DeleteMapping("/api/worklogs/{id}")
    public void deleteWorkLog(
            @PathVariable String id,
            @RequestParam String actingUserId,
            @RequestParam(defaultValue = "false") boolean confirmed) {
        workLogService.deleteWorkLog(id, actingUserId, confirmed);
    }

    @GetMapping("/api/worklogs/{id}/audit")
    public List<AuditLogEntry> getAuditTrail(@PathVariable String id) {
        return workLogService.getAuditTrail(id);
    }
}