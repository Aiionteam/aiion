package site.aiion.api.pathfinder;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.context.annotation.ComponentScan;

@EnableDiscoveryClient
@SpringBootApplication
@ComponentScan(basePackages = "site.aiion.api.pathfinder")
@EntityScan(basePackages = {"site.aiion.api.pathfinder"})
public class PathfinderServiceApplication 
{

	public static void main(String[] args) {
		SpringApplication.run(PathfinderServiceApplication.class, args);
	}

}

