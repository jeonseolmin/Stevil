package com.my.stevil_back.post.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class PostRequest {
    private String category;
    private String title;
    private String content;
    private boolean notice;
    private boolean allowComment;
    private boolean allowCopy;
    private boolean autoSource;
    private String externalLink;
    private String voteTitle;
    private List<String> voteOptions;
    private boolean allowMultipleVote;
}

