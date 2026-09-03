package com.my.stevil_back.planner;

import com.my.stevil_back.common.security.oauth.entity.CustomUserDetails;
import com.my.stevil_back.user.repository.UserRepository;
import com.my.stevil_back.user.repository.UserWeightRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;

@RestController
@RequestMapping("/api/planner/profile")
public class PlannerProfileController {
    private final UserRepository users;
    private final UserWeightRepository weights;
    public PlannerProfileController(UserRepository users,UserWeightRepository weights) {
        this.users=users; this.weights=weights;
    }
    public record Profile(Double weightKg,LocalDateTime weightRecordedAt,Double heightCm,Integer age,String sex) {}
    @GetMapping @Transactional(readOnly=true)
    public Profile get(@AuthenticationPrincipal CustomUserDetails principal) {
        var user=users.findById(principal.getUserId()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        var now=LocalDateTime.now(ZoneId.of("Asia/Seoul"));
        var weight=weights.findFirstByUserIdAndRecordedAtLessThanEqualOrderByRecordedAtDescIdDesc(user.getId(),now).orElse(null);
        Integer age=user.getBirthDate()==null?null:Period.between(user.getBirthDate(),now.toLocalDate()).getYears();
        return new Profile(weight==null?null:weight.getWeight().doubleValue(),weight==null?null:weight.getRecordedAt(),
                user.getHeightCm(),age,user.getSex()==null?null:user.getSex().name());
    }
}
