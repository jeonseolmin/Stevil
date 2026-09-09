package com.my.stevil_back.planner.service;

import com.my.stevil_back.user.repository.UserRepository;
import com.my.stevil_back.user.repository.UserWeightRepository;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import com.my.stevil_back.planner.dto.response.PlannerProfileResponse;

@Service
public class PlannerProfileService {
    private final UserRepository users;
    private final UserWeightRepository weights;
    public PlannerProfileService(UserRepository users,UserWeightRepository weights) {
        this.users=users; this.weights=weights;
    }
    @Transactional(readOnly=true)
    public PlannerProfileResponse get(Long userId) {
        var user=users.findById(userId).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        var now=LocalDateTime.now(ZoneId.of("Asia/Seoul"));
        var weight=weights.findFirstByUserIdAndRecordedAtLessThanEqualOrderByRecordedAtDescIdDesc(user.getId(),now).orElse(null);
        Integer age=user.getBirthDate()==null?null:Period.between(user.getBirthDate(),now.toLocalDate()).getYears();
        return new PlannerProfileResponse(weight==null?null:weight.getWeight().doubleValue(),weight==null?null:weight.getRecordedAt(),
                user.getHeightCm(),age,user.getSex()==null?null:user.getSex().name());
    }
}
