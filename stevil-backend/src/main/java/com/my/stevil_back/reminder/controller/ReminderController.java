package com.my.stevil_back.reminder.controller;

import com.my.stevil_back.common.security.oauth.entity.CustomUserDetails;
import com.my.stevil_back.reminder.dto.ReminderRequests;
import com.my.stevil_back.reminder.dto.ReminderResponse;
import com.my.stevil_back.reminder.service.ReminderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/* 로그인 사용자의 리마인더 API. userId 는 항상 인증 정보에서만 가져온다. */
@RestController
@RequestMapping("/api/reminders")
@RequiredArgsConstructor
public class ReminderController {

    private final ReminderService reminderService;

    @GetMapping
    public ResponseEntity<List<ReminderResponse>> list(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(reminderService.list(userDetails.getUserId()));
    }

    @PostMapping
    public ResponseEntity<ReminderResponse> create(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody ReminderRequests.Create request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reminderService.create(userDetails.getUserId(), request));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ReminderResponse> update(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @RequestBody ReminderRequests.Update request
    ) {
        return ResponseEntity.ok(reminderService.update(userDetails.getUserId(), id, request));
    }

    @PatchMapping("/{id}/enabled")
    public ResponseEntity<ReminderResponse> setEnabled(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody ReminderRequests.Enabled request
    ) {
        return ResponseEntity.ok(reminderService.setEnabled(userDetails.getUserId(), id, request.enabled()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id
    ) {
        reminderService.delete(userDetails.getUserId(), id);
        return ResponseEntity.noContent().build();
    }
}
