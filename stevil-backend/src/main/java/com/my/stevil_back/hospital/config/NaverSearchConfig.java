package com.my.stevil_back.hospital.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties(NaverSearchProperties.class)
public class NaverSearchConfig {

    @Bean
    public RestClient naverSearchRestClient() {
        return RestClient.builder()
                .baseUrl(
                        "https://naverapihub.apigw.ntruss.com"
                )
                .requestInterceptor(
                        (request, body, execution) -> {
                            System.out.println(
                                    "NAVER API HUB 요청 URL = "
                                            + request.getURI()
                            );

                            return execution.execute(
                                    request,
                                    body
                            );
                        }
                )
                .build();
    }
}