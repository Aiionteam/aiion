package site.aiion.api.common;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan(basePackages = "site.aiion.api.common")
public class CommonServiceApplication 
{

	public static void main(String[] args) {
		SpringApplication.run(CommonServiceApplication.class, args);
	}

}

