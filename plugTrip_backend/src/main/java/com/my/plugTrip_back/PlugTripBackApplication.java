package com.my.plugTrip_back;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class PlugTripBackApplication {

	public static void main(String[] args) {
		SpringApplication.run(PlugTripBackApplication.class, args);
	}

}
