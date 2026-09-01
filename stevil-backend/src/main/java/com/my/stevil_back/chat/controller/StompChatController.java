package com.my.stevil_back.chat.controller;

import com.my.stevil_back.chat.dto.ChatMessageDto;
import com.my.stevil_back.chat.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class StompChatController {

    private final SimpMessageSendingOperations messagingTemplate;
    private final ChatService chatService;

    // 프론트엔드에서 "/pub/chat/message"로 메시지를 보내면 이 메서드가 실행됨
    @MessageMapping("/chat/message")
    public void message(ChatMessageDto message) {
        // 1. DB에 메시지 저장
        ChatMessageDto savedMessage = chatService.saveMessage(message);

        // 2. "/sub/chat/room/{roomId}" 채널을 구독 중인 프론트엔드 유저들에게 뿌려줌
        messagingTemplate.convertAndSend("/sub/chat/room/" + message.getRoomId(), savedMessage);
    }
}