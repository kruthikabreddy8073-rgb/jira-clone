package com.example.jira.controller;

import com.example.jira.model.Issue;
import com.example.jira.repository.IssueRepository;
import com.example.jira.service.IssueService;
import org.bson.types.ObjectId;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/issues")
public class IssueController {

    private final IssueRepository issueRepository;
    private final IssueService issueService;

    public IssueController(IssueRepository issueRepository, IssueService issueService) {
        this.issueRepository = issueRepository;
        this.issueService = issueService;
    }

    @PostMapping
    public Issue createIssue(@RequestBody Issue issue) {
        return issueService.createIssue(issue);
    }

    @GetMapping("/project/{projectId}")
    public List<Issue> getIssuesByProject(@PathVariable String projectId) {
        return issueRepository.findByProjectId(projectId);
    }

    @GetMapping("/{id}")
    public Issue getIssueById(@PathVariable String id) {
        return issueRepository.findById(new ObjectId(id))
                .orElseThrow(() -> new RuntimeException("Issue not found"));
    }

    @PutMapping("/{id}")
    public Issue updateIssue(@PathVariable String id, @RequestBody Issue updated) {
        return issueService.updateIssue(id, updated);
    }

    @DeleteMapping("/{id}")
    public void deleteIssue(@PathVariable String id) {
        issueService.deleteIssue(id);
    }

    @PostMapping("/{parentId}/subtasks")
    public Issue createSubtask(@PathVariable String parentId, @RequestBody Issue subtask) {
        return issueService.createSubtask(parentId, subtask);
    }

    @GetMapping("/{parentId}/subtasks")
    public List<Issue> getSubtasks(@PathVariable String parentId) {
        return issueService.getSubtasks(parentId);
    }

    @PostMapping("/{id}/dependencies/{blockingIssueId}")
    public Issue addDependency(@PathVariable String id, @PathVariable String blockingIssueId) {
        return issueService.addDependency(id, blockingIssueId);
    }

    @DeleteMapping("/{id}/dependencies/{blockingIssueId}")
    public Issue removeDependency(@PathVariable String id, @PathVariable String blockingIssueId) {
        return issueService.removeDependency(id, blockingIssueId);
    }

    @GetMapping("/{id}/dependencies")
    public List<Issue> getDependencies(@PathVariable String id) {
        return issueService.getDependencies(id);
    }

    @GetMapping("/{id}/blocks")
    public List<Issue> getBlockedDependents(@PathVariable String id) {
        return issueService.getBlockedDependents(id);
    }
}
