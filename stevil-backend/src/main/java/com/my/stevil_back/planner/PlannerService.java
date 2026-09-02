package com.my.stevil_back.planner;

import com.my.stevil_back.user.entity.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.validation.Validator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import tools.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.*;
import java.time.*;
import java.util.concurrent.ConcurrentHashMap;
import static com.my.stevil_back.planner.PlannerTypes.*;

@Service
public class PlannerService {
    private final WeeklyPlanRepository repository;
    private final EntityManager em;
    private final ObjectMapper json;
    private final Validator validator;
    private final URI generator;
    private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private final ConcurrentHashMap<Long,Instant> requests=new ConcurrentHashMap<>();
    public PlannerService(WeeklyPlanRepository repository,EntityManager em,ObjectMapper json,Validator validator,
            @Value("${planner.generator-url:http://127.0.0.1:8091/api/plan}") String url) {
        this.repository=repository;this.em=em;this.json=json;this.validator=validator;this.generator=URI.create(url);
    }
    public Draft generate(Long userId,Preferences p) {
        PlannerValidation.preferences(p);
        if(!p.aiConsent()) throw new IllegalArgumentException("입력한 생활 정보를 AI에 전송하는 데 동의해 주세요.");
        var now=Instant.now();
        requests.entrySet().removeIf(entry->entry.getValue().isBefore(now.minusSeconds(300)));
        requests.compute(userId,(key,last)->{
            if(last!=null && last.isAfter(now.minusSeconds(100))) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"계획 생성 후 잠시 기다려 주세요.");
            return now;
        });
        try {
            var request=HttpRequest.newBuilder(generator).timeout(Duration.ofSeconds(95)).header("Content-Type","application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(p))).build();
            var response=client.send(request,HttpResponse.BodyHandlers.ofString());
            if(response.body().length()>400_000) throw new IllegalStateException();
            if(response.statusCode()!=200) {
                var failure=json.readTree(response.body());
                if("FOOD_NOT_READY".equals(failure.path("code").asText()))
                    throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,failure.path("error").asText());
                throw new IllegalStateException();
            }
            var draft=json.readValue(response.body(),Draft.class);
            if(draft==null || !validator.validate(draft).isEmpty()) throw new IllegalStateException();
            PlannerValidation.events(p,draft.events());
            return draft;
        } catch(ResponseStatusException error) {
            requests.remove(userId,now);
            throw error;
        } catch(InterruptedException error) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"계획 생성을 완료하지 못했습니다.");
        } catch(Exception error) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"AI 계획을 생성하지 못했습니다. 연결 상태를 확인해 주세요.");
        }
    }
    @Transactional(readOnly=true)
    public Saved get(Long userId,LocalDate week) {
        return repository.findByUserIdAndWeekStart(userId,week).map(this::decode).orElse(null);
    }
    @Transactional
    public Saved save(Long userId,Save request) {
        PlannerValidation.events(request.preferences(),request.events());
        // Serializes first inserts as well as updates across app instances.
        if(em.find(User.class,userId,LockModeType.PESSIMISTIC_WRITE)==null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        var plan=repository.findByUserIdAndWeekStart(userId,request.preferences().weekStart())
                .orElseGet(()->new WeeklyPlan(userId,request.preferences().weekStart()));
        if(plan.getRevision()!=request.revision()) throw new ResponseStatusException(HttpStatus.CONFLICT,"다른 화면에서 일정이 변경됐습니다. 주간 일정을 다시 불러와 주세요.");
        var result=new Saved(plan.getRevision()+1,request.preferences(),request.events());
        plan.update(json.writeValueAsString(result));repository.save(plan);
        return result;
    }
    private Saved decode(WeeklyPlan plan) {return json.readValue(plan.getPayload(),Saved.class);}
}
