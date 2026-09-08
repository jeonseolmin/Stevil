package com.my.stevil_back.chat.repository;

import com.my.stevil_back.chat.entity.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ChatRoomRepository extends JpaRepository<ChatRoom, String> {
    @Query("SELECT c FROM ChatRoom c WHERE (c.user1Nickname = :myNickname AND c.user2Nickname = :targetNickname) OR (c.user1Nickname = :targetNickname AND c.user2Nickname = :myNickname)")
    Optional<ChatRoom> findChatRoom(String myNickname, String targetNickname);

    @Query("SELECT c FROM ChatRoom c WHERE c.user1Nickname = :nickname OR c.user2Nickname = :nickname")
    List<ChatRoom> findMyChatRooms(String nickname);
}