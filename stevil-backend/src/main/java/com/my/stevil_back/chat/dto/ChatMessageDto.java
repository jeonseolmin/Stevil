package com.my.stevil_back.chat.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessageDto {
    private String roomId;
    private String senderNickname;
    private String content;
    private String createdAt;
}