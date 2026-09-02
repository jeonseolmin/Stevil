package com.my.stevil_back.chat.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatRoomListDto {
    private Long roomId;
    private String targetNickname;
    private String lastMessage;
    private String lastMessageTime;
}