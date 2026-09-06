package com.example.jira.controller;

import com.example.jira.model.User;
import com.example.jira.service.UserProfileService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/users/{id}")
public class UserProfileController {

    private final UserProfileService userProfileService;

    public UserProfileController(UserProfileService userProfileService) {
        this.userProfileService = userProfileService;
    }

    @PutMapping("/profile")
    public User updateProfile(
            @PathVariable String id,
            @RequestParam String actingUserId,
            @RequestBody Map<String, String> body) {
        return userProfileService.updateProfile(id, actingUserId, body.get("name"), body.get("phone"));
    }

    @PostMapping(value = "/avatar", consumes = "multipart/form-data")
    public User updateAvatar(
            @PathVariable String id,
            @RequestParam String actingUserId,
            @RequestParam("file") MultipartFile file) {
        return userProfileService.updateAvatar(id, actingUserId, file);
    }

    @PostMapping("/email-change")
    public Map<String, String> requestEmailChange(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        return userProfileService.requestEmailChange(id, body.get("newEmail"), body.get("currentPassword"));
    }

    @GetMapping("/email-change/confirm")
    public User confirmEmailChange(@PathVariable String id, @RequestParam String token) {
        return userProfileService.confirmEmailChange(id, token);
    }

    @PutMapping("/password")
    public Map<String, String> changePassword(
            @PathVariable String id,
            @RequestParam String actingUserId,
            @RequestBody Map<String, String> body) {
        userProfileService.changePassword(id, actingUserId, body.get("currentPassword"), body.get("newPassword"));
        return Map.of("message", "Password updated successfully");
    }

    @PostMapping("/deactivate")
    public Map<String, String> deactivateAccount(
            @PathVariable String id,
            @RequestParam String actingUserId,
            @RequestBody Map<String, String> body) {
        userProfileService.deactivateAccount(id, actingUserId, body.get("currentPassword"));
        return Map.of("message", "Account deactivated");
    }
        @PostMapping("/reactivate")
    public Map<String, String> reactivateAccount(@PathVariable String id) {
        userProfileService.reactivateAccount(id);
        return Map.of("message", "Account reactivated");
    }

    @PutMapping("/notification-preferences")
    public User updateNotificationPreferences(
            @PathVariable String id,
            @RequestParam String actingUserId,
            @RequestBody Map<String, Boolean> body) {
        boolean emailEnabled = Boolean.TRUE.equals(body.get("emailNotificationsEnabled"));
        return userProfileService.updateNotificationPreferences(id, actingUserId, emailEnabled);
    }
}