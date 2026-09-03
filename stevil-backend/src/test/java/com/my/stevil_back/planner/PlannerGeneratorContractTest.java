package com.my.stevil_back.planner;

import com.sun.net.httpserver.HttpServer;
import jakarta.persistence.EntityManager;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import static com.my.stevil_back.planner.PlannerTypes.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

class PlannerGeneratorContractTest {
    @Test void realSourceNutritionPassesHttpContractAndValidationFailuresCanRetry() throws Exception {
        byte[] valid;
        try(var stream=getClass().getResourceAsStream("/planner/composed-draft.json")) {
            assertNotNull(stream); valid=stream.readAllBytes();
        }
        var calls=new AtomicInteger();
        var sourceText=new String(valid,StandardCharsets.UTF_8);
        assertTrue(sourceText.contains("\"1130.000\""));
        var previousResponse=sourceText.replace("\"1130.000\"","\"1,130.000\"").getBytes(StandardCharsets.UTF_8);
        var server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        server.createContext("/plan",exchange->{
            exchange.getRequestBody().readAllBytes();
            var body=calls.getAndIncrement()==0 ? previousResponse : valid;
            exchange.getResponseHeaders().set("Content-Type","application/json");
            exchange.sendResponseHeaders(200,body.length);
            try(var out=exchange.getResponseBody()) {out.write(body);}
        });
        server.start();
        try(var factory=Validation.buildDefaultValidatorFactory()) {
            var service=new PlannerService(mock(WeeklyPlanRepository.class),mock(EntityManager.class),new ObjectMapper(),
                factory.getValidator(),"http://127.0.0.1:"+server.getAddress().getPort()+"/plan");
            var p=new Preferences(LocalDate.of(2026,9,7),LocalTime.of(7,0),LocalTime.of(23,0),
                LocalTime.of(8,0),LocalTime.of(12,30),LocalTime.of(18,30),LocalTime.of(19,30),30,
                List.of(0,2,4),"초보","가볍게","","","",List.of(),true);
            var error=assertThrows(ResponseStatusException.class,()->service.generate(17L,p));
            assertEquals(502,error.getStatusCode().value());
            assertTrue(error.getReason().contains("검증"));
            var draft=assertDoesNotThrow(()->service.generate(17L,p));
            assertEquals(3,draft.events().getFirst().foodEvidence().components().size());
            assertEquals(2,calls.get());
        } finally {server.stop(0);}
    }
}
