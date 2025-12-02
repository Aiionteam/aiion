package site.aiion.api.user;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.context.annotation.ComponentScan;

@EnableDiscoveryClient
@SpringBootApplication
@ComponentScan(basePackages = "site.aiion.api.user")
public class UserServiceApplication 
{

	public static void main(String[] args) {
		SpringApplication.run(UserServiceApplication.class, args);
	}

}

