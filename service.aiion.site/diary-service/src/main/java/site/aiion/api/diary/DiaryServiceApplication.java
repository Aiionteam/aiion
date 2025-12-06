package site.aiion.api.diary;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.context.annotation.ComponentScan;

@EnableDiscoveryClient
@SpringBootApplication
@ComponentScan(basePackages = "site.aiion.api.diary")
@EntityScan(basePackages = {"site.aiion.api.diary", "site.aiion.api.diary.emotion"})
public class DiaryServiceApplication 
{

	public static void main(String[] args) {
		SpringApplication.run(DiaryServiceApplication.class, args);
		System.out.println("[DiaryServiceApplication] EntityScan packages: site.aiion.api.diary, site.aiion.api.diary.emotion");
	}

}

