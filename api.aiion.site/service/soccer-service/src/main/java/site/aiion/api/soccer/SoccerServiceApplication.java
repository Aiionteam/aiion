package site.aiion.api.soccer;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.context.annotation.ComponentScan;

@EnableDiscoveryClient
@SpringBootApplication
@ComponentScan(basePackages = "site.aiion.api.soccer")
public class SoccerServiceApplication 
{

	public static void main(String[] args) {
		SpringApplication.run(SoccerServiceApplication.class, args);
	}

}

