package com.my.stevil_back.post.dto;

import lombok.Getter;
import lombok.Setter;
import java.util.List;

@Getter @Setter
public class VoteRequest {
    private List<Long> optionIds;
}