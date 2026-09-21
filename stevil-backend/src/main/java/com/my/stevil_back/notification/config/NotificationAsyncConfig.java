package com.my.stevil_back.notification.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.RejectedExecutionHandler;

/*
 * 푸시 전달 전용 스레드풀. 알림 저장 트랜잭션이 커밋된 뒤(AFTER_COMMIT) 리스너가 여기로 작업을 넘긴다.
 *
 * 큐가 가득 차면 작업을 버리고 로그만 남긴다. AbortPolicy 는 예외가 AFTER_COMMIT 을 거쳐 요청으로 전파되고,
 * CallerRunsPolicy 는 요청 스레드를 붙잡는다. 알림은 이미 DB 에 커밋되어 있으므로 푸시 한 건이 버려져도 데이터는 유실되지 않는다.
 */
@Slf4j
@Configuration
@EnableAsync
public class NotificationAsyncConfig {

    public static final String PUSH_EXECUTOR = "notificationPushExecutor";

    static final int CORE_POOL_SIZE = 2;
    static final int MAX_POOL_SIZE = 4;
    static final int QUEUE_CAPACITY = 500;

    @Bean(PUSH_EXECUTOR)
    public ThreadPoolTaskExecutor notificationPushExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(CORE_POOL_SIZE);
        executor.setMaxPoolSize(MAX_POOL_SIZE);
        executor.setQueueCapacity(QUEUE_CAPACITY);
        executor.setThreadNamePrefix("notification-push-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(10);
        executor.setRejectedExecutionHandler(dropAndLog());
        return executor;
    }

    static RejectedExecutionHandler dropAndLog() {
        return (task, pool) -> log.warn("Push queue full, dropping one push delivery (notification stays saved): "
                + "active={}, queued={}", pool.getActiveCount(), pool.getQueue().size());
    }
}
