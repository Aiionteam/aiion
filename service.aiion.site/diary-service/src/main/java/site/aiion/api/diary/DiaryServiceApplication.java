package site.aiion.api.diary;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.jdbc.core.JdbcTemplate;

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

	@Bean
	public CommandLineRunner initSequence(JdbcTemplate jdbcTemplate) {
		return args -> {
			try {
				// diaries 시퀀스 재설정
				String maxIdQuery = "SELECT COALESCE(MAX(id), 0) FROM diaries";
				Integer maxId = jdbcTemplate.queryForObject(maxIdQuery, Integer.class);
				if (maxId != null && maxId > 0) {
					String resetSequence = String.format("SELECT setval('diaries_id_seq', %d, true)", maxId);
					jdbcTemplate.execute(resetSequence);
					System.out.println("[DiaryServiceApplication] diaries 시퀀스 재설정 완료: " + maxId);
				}
			} catch (Exception e) {
				System.err.println("[DiaryServiceApplication] 시퀀스 재설정 실패: " + e.getMessage());
			}
		};
	}

}

