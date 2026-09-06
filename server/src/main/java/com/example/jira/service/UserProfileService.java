package com.example.jira.service;

import com.example.jira.exception.BadRequestException;
import com.example.jira.exception.ForbiddenException;
import com.example.jira.exception.NotFoundException;
import com.example.jira.model.User;
import com.example.jira.repository.UserRepository;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class UserProfileService {

    private static final long MAX_AVATAR_BYTES = 5L * 1024 * 1024; // 5MB
    private static final Set<String> ALLOWED_AVATAR_TYPES =
            Set.of("image/png", "image/jpeg", "image/jpg", "image/webp");

    private static final Pattern STRONG_PASSWORD =
            Pattern.compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z0-9]).{8,}$");

    private static final Pattern EMAIL_FORMAT =
            Pattern.compile("^[\\w.+-]+@[\\w-]+\\.[a-zA-Z]{2,}$");

    private static final long EMAIL_TOKEN_VALID_HOURS = 24;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String uploadDir;
    private final String baseUrl;
    private final EmailService emailService;

    public UserProfileService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.upload.dir:uploads/avatars}") String uploadDir,
            @Value("${app.base-url:http://localhost:8080}") String baseUrl,
            EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.uploadDir = uploadDir;
        this.baseUrl = baseUrl;
        this.emailService = emailService;
    }

    public User updateProfile(String userId, String actingUserId, String name, String phone) {
        requireOwnership(userId, actingUserId);
        User user = getUserOrThrow(userId);
        requireActive(user);

        if (name != null && !name.isBlank()) {
            user.setName(name);
        }
        if (phone != null) {
            user.setPhone(phone);
        }
        return userRepository.save(user);
    }

    public Map<String, String> requestEmailChange(String userId, String newEmail, String currentPassword) {
        User user = getUserOrThrow(userId);
        requireActive(user);
        requireCurrentPassword(user, currentPassword);

        if (newEmail == null || !EMAIL_FORMAT.matcher(newEmail).matches()) {
            throw new BadRequestException("Please provide a valid email address");
        }
        if (newEmail.equalsIgnoreCase(user.getEmail())) {
            throw new BadRequestException("This is already your current email address");
        }
        if (userRepository.findByEmail(newEmail).isPresent()) {
            throw new BadRequestException("That email address is already in use");
        }

        String token = UUID.randomUUID().toString();
        user.setPendingEmail(newEmail);
        user.setEmailVerificationToken(token);
        user.setEmailVerificationExpiresAt(Instant.now().plus(EMAIL_TOKEN_VALID_HOURS, ChronoUnit.HOURS));
        userRepository.save(user);

        String confirmationLink = "/api/users/" + userId + "/email-change/confirm?token=" + token;
        String fullConfirmationLink = baseUrl + confirmationLink;
        emailService.send(
                newEmail,
                "Confirm your new email address",
                "Click the link below to confirm this address for your Jira Clone account:\n\n"
                        + fullConfirmationLink
                        + "\n\nThis link expires in " + EMAIL_TOKEN_VALID_HOURS + " hours."
        );

        return Map.of(
                "message", "A confirmation link has been sent to " + newEmail,
                "devConfirmationLink", confirmationLink
        );
    }

    public User confirmEmailChange(String userId, String token) {
        User user = getUserOrThrow(userId);

        if (user.getPendingEmail() == null || user.getEmailVerificationToken() == null) {
            throw new BadRequestException("No pending email change to confirm");
        }
        if (!user.getEmailVerificationToken().equals(token)) {
            throw new BadRequestException("Invalid verification token");
        }
        if (user.getEmailVerificationExpiresAt() == null
                || Instant.now().isAfter(user.getEmailVerificationExpiresAt())) {
            throw new BadRequestException("This verification link has expired - please request a new one");
        }

        user.setEmail(user.getPendingEmail());
        user.setPendingEmail(null);
        user.setEmailVerificationToken(null);
        user.setEmailVerificationExpiresAt(null);
        return userRepository.save(user);
    }

    public void changePassword(String userId, String actingUserId, String currentPassword, String newPassword) {
        requireOwnership(userId, actingUserId);
        User user = getUserOrThrow(userId);
        requireActive(user);
        requireCurrentPassword(user, currentPassword);

        if (newPassword == null || !STRONG_PASSWORD.matcher(newPassword).matches()) {
            throw new BadRequestException(
                    "New password must be at least 8 characters and include an uppercase letter, "
                            + "a lowercase letter, a number, and a special character");
        }
        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new BadRequestException("New password must be different from your current password");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    public User updateAvatar(String userId, String actingUserId, MultipartFile file) {
        requireOwnership(userId, actingUserId);
        User user = getUserOrThrow(userId);
        requireActive(user);

        if (file == null || file.isEmpty()) {
            throw new BadRequestException("No file was uploaded");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_AVATAR_TYPES.contains(contentType.toLowerCase())) {
            throw new BadRequestException("Unsupported image format - only JPG, JPEG, and PNG are allowed");
        }
        if (file.getSize() > MAX_AVATAR_BYTES) {
            throw new BadRequestException("Image exceeds the maximum allowed size of 5MB");
        }

        try {
            Path dir = Paths.get(uploadDir);
            Files.createDirectories(dir);

            String extension = switch (contentType.toLowerCase()) {
                case "image/png" -> ".png";
                case "image/webp" -> ".webp";
                default -> ".jpg";
            };
            String filename = UUID.randomUUID() + extension;
            Path destination = dir.resolve(filename);
            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);

            deleteOldAvatarFileIfLocal(user.getAvatar());

            user.setAvatar(baseUrl + "/uploads/avatars/" + filename);
            return userRepository.save(user);
        } catch (IOException e) {
            throw new BadRequestException("Failed to store the uploaded image");
        }
    }

    private void deleteOldAvatarFileIfLocal(String previousAvatarPath) {
        String marker = "/uploads/avatars/";
        if (previousAvatarPath == null || !previousAvatarPath.contains(marker)) {
            return;
        }
        try {
            String previousFilename = previousAvatarPath.substring(
                    previousAvatarPath.indexOf(marker) + marker.length());
            if (previousFilename.isBlank() || previousFilename.contains("..") || previousFilename.contains("/")) {
                return;
            }
            Path previousFile = Paths.get(uploadDir).resolve(previousFilename);
            Files.deleteIfExists(previousFile);
        } catch (IOException e) {
            // Non-fatal: the new avatar was already saved successfully.
        }
    }

    public void deactivateAccount(String userId, String actingUserId, String currentPassword) {
        requireOwnership(userId, actingUserId);
        User user = getUserOrThrow(userId);
        requireCurrentPassword(user, currentPassword);

        user.setActive(false);
        userRepository.save(user);
    }

    public void reactivateAccount(String userId) {
        User user = getUserOrThrow(userId);
        user.setActive(true);
        userRepository.save(user);
    }

    public User updateNotificationPreferences(String userId, String actingUserId, boolean emailEnabled) {
        requireOwnership(userId, actingUserId);
        User user = getUserOrThrow(userId);
        user.setEmailNotificationsEnabled(emailEnabled);
        return userRepository.save(user);
    }

    private void requireCurrentPassword(User user, String currentPassword) {
        if (currentPassword == null || !passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }
    }

    private void requireOwnership(String userId, String actingUserId) {
        if (actingUserId == null || actingUserId.isBlank() || !actingUserId.equals(userId)) {
            throw new ForbiddenException("You can only modify your own profile");
        }
    }

    private void requireActive(User user) {
        if (!user.isActive()) {
            throw new BadRequestException("This account has been deactivated");
        }
    }

    private User getUserOrThrow(String id) {
        try {
            return userRepository.findById(new ObjectId(id))
                    .orElseThrow(() -> new NotFoundException("User not found: " + id));
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid user id: " + id);
        }
    }
}