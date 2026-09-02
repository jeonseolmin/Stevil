package com.my.stevil_back.chat.controller;
import com.my.stevil_back.chat.dto.*;
import com.my.stevil_back.chat.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatRoomController {
    private final ChatService chatService;

    @PostMapping("/room")
    public ResponseEntity<Long> createOrGetRoom(@RequestParam String myNickname, @RequestParam String targetNickname) {
        return ResponseEntity.ok(chatService.createOrGetRoom(myNickname, targetNickname));
    }

    @GetMapping("/room/{roomId}/messages")
    public ResponseEntity<List<ChatMessageDto>> getChatHistory(@PathVariable Long roomId) {
        return ResponseEntity.ok(chatService.getChatHistory(roomId));
    }

    @GetMapping("/rooms")
    public ResponseEntity<List<ChatRoomListDto>> getMyChatRooms(@RequestParam String myNickname) {
        return ResponseEntity.ok(chatService.getMyChatRooms(myNickname));
    }
}