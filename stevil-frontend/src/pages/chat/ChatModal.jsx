import { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import axiosInstance from '../../api/axiosInstance';
import './ChatModal.css';

export default function ChatModal({ roomId, myNickname, targetNickname, onClose }) {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    
    const stompClient = useRef(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        fetchChatHistory();
        connectWebSocket();

        return () => disconnectWebSocket();
    }, [roomId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchChatHistory = async () => {
        try {
            const response = await axiosInstance.get(`/chat/room/${roomId}/messages`);
            setMessages(response.data);
        } catch (error) {
            console.error("채팅 내역 로드 실패", error);
        }
    };

    const connectWebSocket = () => {
        const client = new Client({
            webSocketFactory: () => new SockJS('http://localhost:8080/ws-stomp'),
            debug: (str) => {
            },
            reconnectDelay: 5000, // 연결 끊기면 5초 뒤 자동 재연결
            onConnect: () => {
                console.log("웹소켓 연결 성공!");
                client.subscribe(`/sub/chat/room/${roomId}`, (message) => {
                    const receivedMessage = JSON.parse(message.body);
                    setMessages((prev) => [...prev, receivedMessage]);
                });
            },
            onStompError: (frame) => {
                console.error("STOMP 브로커 에러:", frame.headers['message']);
            },
        });

        client.activate(); // 연결 시작!
        stompClient.current = client;
    };

    const disconnectWebSocket = () => {
        if (stompClient.current) {
            stompClient.current.deactivate(); // 최신 버전의 연결 끊기 명령어
        }
    };

    const sendMessage = () => {
        if (!inputValue.trim() || !stompClient.current || !stompClient.current.connected) return;
        const chatMessage = {
            roomId: roomId,
            senderNickname: myNickname, // 이메일 대신 닉네임 발송
            content: inputValue
        };
        stompClient.current.publish({ destination: "/pub/chat/message", body: JSON.stringify(chatMessage) });
        setInputValue('');
    };

    return (
        <div className="chat-modal-backdrop" onClick={onClose}>
            <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
                <div className="chat-header">
                    <h3>{targetNickname} 님과의 대화</h3>
                    <button className="close-btn" onClick={onClose}>X</button>
                </div>
                
                <div className="chat-body">
                {messages.map((msg, index) => {
                const isMe = msg.senderNickname === myNickname;
                return (
                    <div key={index} className={`chat-message ${isMe ? 'my-message' : 'other-message'}`}>
                        {!isMe && <span className="chat-sender">{msg.senderNickname}</span>}
                        <div className="chat-bubble">{msg.content}</div>
                        <span className="chat-time">{msg.createdAt}</span>
                    </div>
                );
            })}
            <div ref={messagesEndRef} />
        </div>

                <div className="chat-footer">
                    <input 
                        type="text" 
                        placeholder="메시지를 입력하세요" 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    />
                    <button onClick={sendMessage}>전송</button>
                </div>
            </div>
        </div>
    );
}