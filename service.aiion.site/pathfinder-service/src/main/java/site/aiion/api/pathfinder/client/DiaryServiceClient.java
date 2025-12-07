package site.aiion.api.pathfinder.client;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import site.aiion.api.pathfinder.common.domain.Messenger;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * diary-service와 통신하는 클라이언트
 */
@Slf4j
@Component
public class DiaryServiceClient {
    
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    
    @Value("${diary.service.url:http://diary-service:8083}")
    private String diaryServiceUrl;
    
    public DiaryServiceClient(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }
    
    /**
     * 사용자 ID로 일기 목록 조회
     * 컨테이너 간 직접 통신이므로 게이트웨이 경로(/diary) 제외
     * 
     * @param userId 사용자 ID
     * @return 일기 목록 (DiaryModel 리스트)
     */
    public List<Map<String, Object>> findDiariesByUserId(Long userId) {
        try {
            String url = diaryServiceUrl + "/diaries/user/" + userId;
            log.info("[DiaryServiceClient] 일기 조회 요청: {}", url);
            
            ResponseEntity<Messenger> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                null,
                Messenger.class
            );
            
            Messenger messenger = response.getBody();
            if (messenger == null || messenger.getCode() != 200) {
                log.warn("[DiaryServiceClient] 일기 조회 실패: code={}, message={}", 
                    messenger != null ? messenger.getCode() : "null",
                    messenger != null ? messenger.getMessage() : "null");
                return new ArrayList<>();
            }
            
            Object data = messenger.getData();
            if (data == null) {
                log.warn("[DiaryServiceClient] 일기 데이터가 null입니다.");
                return new ArrayList<>();
            }
            
            // List<DiaryModel>을 List<Map>으로 변환
            List<Map<String, Object>> diaries = objectMapper.convertValue(
                data,
                new TypeReference<List<Map<String, Object>>>() {}
            );
            
            log.info("[DiaryServiceClient] 일기 조회 성공: {}개", diaries.size());
            return diaries;
            
        } catch (Exception e) {
            log.error("[DiaryServiceClient] 일기 조회 중 오류 발생: {}", e.getMessage(), e);
            return new ArrayList<>();
        }
    }
}

