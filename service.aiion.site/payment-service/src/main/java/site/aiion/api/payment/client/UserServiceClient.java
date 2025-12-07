package site.aiion.api.payment.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * user-service와 통신하는 클라이언트
 */
@Slf4j
@Component
public class UserServiceClient {
    
    private final RestTemplate restTemplate;
    
    @Value("${user.service.url:http://user-service:8082}")
    private String userServiceUrl;
    
    public UserServiceClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }
    
    /**
     * 사용자 구독 상태 업데이트
     */
    public void updateSubscription(Long userId, String subscriptionType, LocalDateTime expiresAt) {
        try {
            String url = userServiceUrl + "/users/" + userId + "/subscription";
            
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("subscriptionType", subscriptionType);
            requestBody.put("isPremium", true);
            requestBody.put("expiresAt", expiresAt.toString());
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            
            restTemplate.exchange(
                    url,
                    HttpMethod.PUT,
                    request,
                    Map.class
            );
            
            log.info("[UserServiceClient] 구독 상태 업데이트 성공: userId={}, subscriptionType={}", userId, subscriptionType);
        } catch (Exception e) {
            log.error("[UserServiceClient] 구독 상태 업데이트 오류: {}", e.getMessage());
            // 실패해도 결제는 승인된 상태이므로 예외를 던지지 않음
        }
    }
    
}

