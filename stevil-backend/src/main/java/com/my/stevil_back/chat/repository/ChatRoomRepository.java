package com.my.stevil_back.chat.repository;

import com.my.stevil_back.chat.entity.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {
    @Query("SELECT c FROM ChatRoom c WHERE (c.user1Nickname = :nick1 AND c.user2Nickname = :nick2) OR (c.user1Nickname = :nick2 AND c.user2Nickname = :nick1)")
    Optional<ChatRoom> findChatRoom(@Param("nick1") String nick1, @Param("nick2") String nick2);

    @Query("SELECT c FROM ChatRoom c WHERE c.user1Nickname = :nickname OR c.user2Nickname = :nickname")
    List<ChatRoom> findMyChatRooms(@Param("nickname") String nickname);
}