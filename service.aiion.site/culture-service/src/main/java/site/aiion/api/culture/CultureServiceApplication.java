package site.aiion.api.culture;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.context.annotation.ComponentScan;

@EnableDiscoveryClient
@SpringBootApplication
@ComponentScan(basePackages = "site.aiion.api.culture")
public class CultureServiceApplication 
{

	public static void main(String[] args) {
		SpringApplication.run(CultureServiceApplication.class, args);
	}

}

