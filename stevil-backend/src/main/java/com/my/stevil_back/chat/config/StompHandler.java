package com.my.stevil_back.chat.config;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class StompHandler implements ChannelInterceptor {

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);

        // 사용자가 누군가의 채팅방을 구독(SUBSCRIBE)하려고 시도할 때 가로챕니다.
        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            // 프론트엔드에서 연결할 때 보낸 Authorization 헤더(JWT 토큰 등)를 꺼냅니다.
            String token = accessor.getFirstNativeHeader("Authorization");

            // TODO: 여기서 토큰을 해독하여 현재 유저가 누군지 파악하고,
            // 해당 유저가 구독하려는 채팅방(accessor.getDestination())의
            // 진짜 참여자가 맞는지 DB에서 확인하는 로직을 작성합니다.

            // 만약 참여자가 아니라면 에러를 던져서 구독을 강제로 차단합니다.
            // throw new AccessDeniedException("이 채팅방을 볼 권한이 없습니다.");
        }
        return message;
    }
}