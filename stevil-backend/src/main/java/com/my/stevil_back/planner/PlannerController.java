package com.my.stevil_back.planner;
import com.my.stevil_back.common.security.oauth.entity.CustomUserDetails;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.util.Map;
import static com.my.stevil_back.planner.PlannerTypes.*;

@RestController @RequestMapping("/api/planner")
public class PlannerController {
    private final PlannerService service;
    public PlannerController(PlannerService service) {this.service=service;}
    @PostMapping("/draft") public Draft draft(@AuthenticationPrincipal CustomUserDetails user,@Valid @RequestBody Preferences preferences) {
        return service.generate(user.getUserId(),preferences);
    }
    @GetMapping public ResponseEntity<Saved> get(@AuthenticationPrincipal CustomUserDetails user,@RequestParam LocalDate week) {
        var result=service.get(user.getUserId(),week);
        return result==null?ResponseEntity.noContent().build():ResponseEntity.ok(result);
    }
    @PutMapping public Saved save(@AuthenticationPrincipal CustomUserDetails user,@Valid @RequestBody Save request) {
        return service.save(user.getUserId(),request);
    }
    @ExceptionHandler(IllegalArgumentException.class) ResponseEntity<?> invalid(IllegalArgumentException error) {
        return ResponseEntity.badRequest().body(Map.of("message",error.getMessage()));
    }
    @ExceptionHandler(ResponseStatusException.class) ResponseEntity<?> unavailable(ResponseStatusException error) {
        return ResponseEntity.status(error.getStatusCode()).body(Map.of("message",error.getReason()==null?"요청을 처리하지 못했습니다.":error.getReason()));
    }
}
