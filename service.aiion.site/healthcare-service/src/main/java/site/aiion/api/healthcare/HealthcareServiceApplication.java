package site.aiion.api.healthcare;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.context.annotation.ComponentScan;

@EnableDiscoveryClient
@SpringBootApplication
@ComponentScan(basePackages = "site.aiion.api.healthcare")
@EntityScan(basePackages = {"site.aiion.api.healthcare"})
public class HealthcareServiceApplication 
{

	public static void main(String[] args) {
		SpringApplication.run(HealthcareServiceApplication.class, args);
	}

}

