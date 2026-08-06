package com.my.stevil_back;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class StevilBackApplication {

	public static void main(String[] args) {
		SpringApplication.run(StevilBackApplication.class, args);
	}

}
