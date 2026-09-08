package com.my.stevil_back.chat.service;

import com.my.stevil_back.chat.dto.*;
import com.my.stevil_back.chat.entity.*;
import com.my.stevil_back.chat.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException; // 💡 1. 올바른 예외 클래스로 임포트 수정!
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatService {
    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;

    public ChatRoom getChatRoomWithAuthCheck(String roomId, String currentNickname) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 채팅방입니다."));
        
        boolean isParticipant = room.getUser1Nickname().equals(currentNickname)
                || room.getUser2Nickname().equals(currentNickname);

        if (!isParticipant) {
            throw new AccessDeniedException("해당 채팅방에 접근할 권한이 없습니다.");
        }

        return room;
    }

    @Transactional
    public String createOrGetRoom(String myNickname, String targetNickname) {
        return chatRoomRepository.findChatRoom(myNickname, targetNickname)
                .map(ChatRoom::getId)
                .orElseGet(() -> chatRoomRepository.save(ChatRoom.builder()
                        .user1Nickname(myNickname)
                        .user2Nickname(targetNickname).build()).getId());
    }

    @Transactional
    public ChatMessageDto saveMessage(ChatMessageDto messageDto) {
        ChatRoom room = chatRoomRepository.findById(messageDto.getRoomId()).orElseThrow();
        ChatMessage message = chatMessageRepository.save(ChatMessage.builder()
                .chatRoom(room)
                .senderNickname(messageDto.getSenderNickname())
                .content(messageDto.getContent()).build());
        messageDto.setCreatedAt(message.getCreatedAt().format(DateTimeFormatter.ofPattern("HH:mm")));
        return messageDto;
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDto> getChatHistory(String roomId) {
        return chatMessageRepository.findByChatRoomIdOrderByCreatedAtAsc(roomId).stream()
                .map(msg -> ChatMessageDto.builder()
                        .roomId(msg.getChatRoom().getId())
                        .senderNickname(msg.getSenderNickname())
                        .content(msg.getContent())
                        .createdAt(msg.getCreatedAt().format(DateTimeFormatter.ofPattern("HH:mm")))
                        .build()).toList();
    }

    @Transactional(readOnly = true)
    public List<ChatRoomListDto> getMyChatRooms(String myNickname) {
        return chatRoomRepository.findMyChatRooms(myNickname).stream().map(room -> {
            String targetNickname = room.getUser1Nickname().equals(myNickname) ? room.getUser2Nickname() : room.getUser1Nickname();
            String lastMsg = "", lastTime = "";
            var lastMsgOpt = chatMessageRepository.findTopByChatRoomIdOrderByCreatedAtDesc(room.getId());
            if (lastMsgOpt.isPresent()) {
                lastMsg = lastMsgOpt.get().getContent();
                lastTime = lastMsgOpt.get().getCreatedAt().format(DateTimeFormatter.ofPattern("MM-dd HH:mm"));
            }
            return ChatRoomListDto.builder()
                    .roomId(room.getId()).targetNickname(targetNickname).lastMessage(lastMsg).lastMessageTime(lastTime).build();
        }).toList();
    }
}