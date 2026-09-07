package com.my.stevil_back.chat.repository;

import com.my.stevil_back.chat.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByChatRoomIdOrderByCreatedAtAsc(String roomId);
    Optional<ChatMessage> findTopByChatRoomIdOrderByCreatedAtDesc(String roomId);
}