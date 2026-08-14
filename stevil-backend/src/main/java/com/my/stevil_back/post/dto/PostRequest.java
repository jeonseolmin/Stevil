package com.my.stevil_back.post.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class PostRequest {
    private String category;
    private String title;
    private String content;
    private boolean notice;
}

