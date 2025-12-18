package site.aiion.api.diary.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
public class RestTemplateConfig {
    
    @Bean
    public RestTemplate restTemplate() {
        // 타임아웃 설정: 연결 10초, 읽기 120초 (CPU 환경에서 DL 모델 추론 시간 고려)
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10000); // 10초
        factory.setReadTimeout(120000); // 120초 (CPU로 4개 MBTI 차원 분석 시간 고려)
        
        RestTemplate restTemplate = new RestTemplate(factory);
        return restTemplate;
    }
}
