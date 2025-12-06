package site.aiion.api.pathfinder.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import site.aiion.api.pathfinder.PathfinderAnalysisService.LearningRecommendation;

import java.util.*;

/**
 * ML 서비스와 통신하는 클라이언트
 */
@Slf4j
@Component
public class MLServiceClient {
    
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final DiaryServiceClient diaryServiceClient;
    
    @Value("${ml.service.url:http://aihoyun-ml-service:9005}")
    private String mlServiceUrl;
    
    public MLServiceClient(RestTemplate restTemplate, ObjectMapper objectMapper, DiaryServiceClient diaryServiceClient) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.diaryServiceClient = diaryServiceClient;
    }
    
    /**
     * 사용자의 일기 데이터를 분석하여 ML 기반 학습 추천 생성
     * 
     * @param userId 사용자 ID
     * @return 학습 추천 목록
     */
    public List<LearningRecommendation> getMLRecommendations(Long userId) {
        try {
            log.info("[MLServiceClient] ML 기반 추천 요청 시작 - userId: {}", userId);
            
            // 1. 일기 데이터 조회
            List<Map<String, Object>> diaries = diaryServiceClient.findDiariesByUserId(userId);
            if (diaries.isEmpty()) {
                log.warn("[MLServiceClient] 일기 데이터가 없습니다 - userId: {}", userId);
                return new ArrayList<>();
            }
            
            log.info("[MLServiceClient] 일기 데이터 {}개 조회 완료", diaries.size());
            
            // 2. 각 일기마다 ML 서비스에 예측 요청
            List<LearningRecommendation> recommendations = new ArrayList<>();
            Map<String, Integer> topicFrequency = new HashMap<>();
            Map<String, Double> topicScores = new HashMap<>();
            Map<String, String> topicReasons = new HashMap<>();
            
            for (Map<String, Object> diary : diaries) {
                try {
                    String content = (String) diary.get("content");
                    if (content == null || content.trim().isEmpty()) {
                        continue;
                    }
                    
                    // 감정 정보 가져오기 (diary-service에서 제공하는 경우)
                    Integer emotion = (Integer) diary.get("emotion");
                    if (emotion == null) {
                        emotion = 0; // 기본값: 평가불가
                    }
                    
                    // ML 서비스에 예측 요청
                    Map<String, Object> predictRequest = new HashMap<>();
                    predictRequest.put("diary_content", content);
                    predictRequest.put("emotion", emotion);
                    predictRequest.put("behavior_patterns", ""); // TODO: 행동 데이터 추가 시 수정
                    predictRequest.put("behavior_frequency", ""); // TODO: 행동 데이터 추가 시 수정
                    predictRequest.put("mbti_type", "UNKNOWN"); // TODO: MBTI 데이터 추가 시 수정
                    predictRequest.put("mbti_confidence", 0.0); // TODO: MBTI 데이터 추가 시 수정
                    
                    String predictUrl = mlServiceUrl + "/pathfinder-learning/predict";
                    log.debug("[MLServiceClient] ML 예측 요청: {}", predictUrl);
                    
                    HttpHeaders headers = new HttpHeaders();
                    headers.setContentType(MediaType.APPLICATION_JSON);
                    HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(predictRequest, headers);
                    
                    ResponseEntity<Map> response = restTemplate.exchange(
                        predictUrl,
                        HttpMethod.POST,
                        requestEntity,
                        Map.class
                    );
                    
                    if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                        Map<String, Object> prediction = response.getBody();
                        String recommendedTopic = (String) prediction.get("recommended_topic");
                        Double recommendationScore = ((Number) prediction.get("recommendation_score")).doubleValue();
                        
                        if (recommendedTopic != null) {
                            // 주제별 빈도수 및 점수 누적
                            topicFrequency.put(recommendedTopic, 
                                topicFrequency.getOrDefault(recommendedTopic, 0) + 1);
                            
                            // 최고 점수 유지
                            double currentScore = topicScores.getOrDefault(recommendedTopic, 0.0);
                            if (recommendationScore > currentScore) {
                                topicScores.put(recommendedTopic, recommendationScore);
                            }
                            
                            // 추천 이유 생성
                            String reason = String.format("일기 내용 분석 결과, %s 학습을 추천합니다. (신뢰도: %.1f%%)", 
                                recommendedTopic, recommendationScore * 100);
                            topicReasons.put(recommendedTopic, reason);
                        }
                    }
                    
                } catch (Exception e) {
                    log.warn("[MLServiceClient] 일기 {} 예측 실패: {}", diary.get("id"), e.getMessage());
                    continue;
                }
            }
            
            // 3. 빈도수와 점수를 기준으로 추천 목록 생성
            for (Map.Entry<String, Integer> entry : topicFrequency.entrySet()) {
                String topic = entry.getKey();
                int frequency = entry.getValue();
                double score = topicScores.getOrDefault(topic, 0.0);
                
                // LearningRecommendation 생성
                LearningRecommendation recommendation = 
                    LearningRecommendation.builder()
                        .title(topic)
                        .emoji(getEmojiForTopic(topic))
                        .category(getCategoryForTopic(topic))
                        .frequency(frequency)
                        .reason(topicReasons.getOrDefault(topic, 
                            String.format("일기 분석 결과 %s 학습을 추천합니다.", topic)))
                        .relatedDiary("") // ML 기반이므로 관련 일기 문장은 생략
                        .quickLearn(getQuickLearnForTopic(topic))
                        .build();
                
                recommendations.add(recommendation);
            }
            
            // 점수 기준으로 정렬 (높은 점수 우선)
            recommendations.sort((a, b) -> {
                String topicA = a.getTitle();
                String topicB = b.getTitle();
                double scoreA = topicScores.getOrDefault(topicA, 0.0);
                double scoreB = topicScores.getOrDefault(topicB, 0.0);
                return Double.compare(scoreB, scoreA);
            });
            
            log.info("[MLServiceClient] ML 기반 추천 생성 완료 - {}개", recommendations.size());
            return recommendations;
            
        } catch (Exception e) {
            log.error("[MLServiceClient] ML 기반 추천 생성 중 오류 발생: {}", e.getMessage(), e);
            return new ArrayList<>();
        }
    }
    
    /**
     * 주제에 대한 이모지 반환
     */
    private String getEmojiForTopic(String topic) {
        Map<String, String> emojiMap = new HashMap<>();
        emojiMap.put("응급처치 기초", "🩹");
        emojiMap.put("요리 기초", "🍳");
        emojiMap.put("감정 표현 및 관리", "💭");
        emojiMap.put("글쓰기 및 기록", "✍️");
        emojiMap.put("운동 및 피트니스", "🏃");
        emojiMap.put("기상 관찰 및 기록", "🌤️");
        emojiMap.put("학습 방법론", "📚");
        emojiMap.put("여행 계획 및 준비", "✈️");
        return emojiMap.getOrDefault(topic, "📚");
    }
    
    /**
     * 주제에 대한 카테고리 반환
     */
    private String getCategoryForTopic(String topic) {
        Map<String, String> categoryMap = new HashMap<>();
        categoryMap.put("응급처치 기초", "의료");
        categoryMap.put("요리 기초", "생활");
        categoryMap.put("감정 표현 및 관리", "심리");
        categoryMap.put("글쓰기 및 기록", "문서");
        categoryMap.put("운동 및 피트니스", "건강");
        categoryMap.put("기상 관찰 및 기록", "기상");
        categoryMap.put("학습 방법론", "교육");
        categoryMap.put("여행 계획 및 준비", "문화");
        return categoryMap.getOrDefault(topic, "기타");
    }
    
    /**
     * 주제에 대한 간단 학습 내용 반환
     */
    private String getQuickLearnForTopic(String topic) {
        Map<String, String> quickLearnMap = new HashMap<>();
        quickLearnMap.put("응급처치 기초", "응급상황에서 기본적인 처치 방법을 배웁니다. 상처 관리, 지혈법, 골절 대응 등을 학습합니다.");
        quickLearnMap.put("요리 기초", "기본적인 요리 기술과 레시피를 배웁니다. 간단한 요리부터 시작하여 점진적으로 실력을 향상시킵니다.");
        quickLearnMap.put("감정 표현 및 관리", "감정을 건강하게 표현하고 관리하는 방법을 학습합니다. 감정 인식, 표현 기법, 스트레스 관리 등을 다룹니다.");
        quickLearnMap.put("글쓰기 및 기록", "효과적인 글쓰기와 기록 방법을 학습합니다. 일기 쓰기, 메모 작성, 문서 작성 등의 기술을 향상시킵니다.");
        quickLearnMap.put("운동 및 피트니스", "건강한 신체를 위한 운동 방법을 배웁니다. 유산소 운동, 근력 운동, 유연성 향상 등을 학습합니다.");
        quickLearnMap.put("기상 관찰 및 기록", "날씨 관찰과 기록 방법을 학습합니다. 기상 현상 이해, 날씨 예보 읽기 등을 다룹니다.");
        quickLearnMap.put("학습 방법론", "효과적인 학습 방법과 공부 기법을 배웁니다. 집중력 향상, 기억력 강화, 시험 대비 전략 등을 학습합니다.");
        quickLearnMap.put("여행 계획 및 준비", "체계적인 여행 계획과 준비 방법을 배웁니다. 여행지 조사, 예약, 준비물 체크 등을 학습합니다.");
        return quickLearnMap.getOrDefault(topic, topic + "에 대한 기본 지식을 학습합니다.");
    }
}

