package site.aiion.api.diary.emotion;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.RestClientException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import site.aiion.api.diary.common.domain.Messenger;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class DiaryEmotionServiceImpl implements DiaryEmotionService {

    private final DiaryEmotionRepository diaryEmotionRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    // Business Diary Service URL (Docker 네트워크 내부에서 직접 접근)
    // business/diary_service가 포트 9007에서 실행됨 (컨테이너 이름: aihoyun-diary-service)
    private static final String BUSINESS_SERVICE_URL = "http://aihoyun-diary-service:9007/diary-emotion/predict";
    
    // 감정 라벨 매핑
    private static final Map<Integer, String> EMOTION_LABELS = Map.ofEntries(
        Map.entry(0, "평가불가"),
        Map.entry(1, "기쁨"),
        Map.entry(2, "슬픔"),
        Map.entry(3, "분노"),
        Map.entry(4, "두려움"),
        Map.entry(5, "혐오"),
        Map.entry(6, "놀람"),
        Map.entry(7, "신뢰"),
        Map.entry(8, "기대"),
        Map.entry(9, "불안"),
        Map.entry(10, "안도"),
        Map.entry(11, "후회"),
        Map.entry(12, "그리움"),
        Map.entry(13, "감사"),
        Map.entry(14, "외로움")
    );

    private DiaryEmotionModel entityToModel(DiaryEmotion entity) {
        if (entity == null) {
            return null;
        }
        return DiaryEmotionModel.builder()
                .id(entity.getId())
                .diaryId(entity.getDiaryId())
                .emotion(entity.getEmotion())
                .emotionLabel(entity.getEmotionLabel())
                .confidence(entity.getConfidence())
                .probabilities(entity.getProbabilities())
                .analyzedAt(entity.getAnalyzedAt())
                .build();
    }

    private DiaryEmotion modelToEntity(DiaryEmotionModel model) {
        return DiaryEmotion.builder()
                .id(model.getId())
                .diaryId(model.getDiaryId())
                .emotion(model.getEmotion())
                .emotionLabel(model.getEmotionLabel())
                .confidence(model.getConfidence())
                .probabilities(model.getProbabilities())
                .analyzedAt(model.getAnalyzedAt() != null ? model.getAnalyzedAt() : LocalDateTime.now())
                .build();
    }

    @Override
    public Messenger findByDiaryId(Long diaryId) {
        if (diaryId == null) {
            return Messenger.builder()
                    .code(400)
                    .message("일기 ID가 필요합니다.")
                    .build();
        }
        
        Optional<DiaryEmotion> emotion = diaryEmotionRepository.findByDiaryId(diaryId);
        if (emotion.isPresent()) {
            DiaryEmotionModel model = entityToModel(emotion.get());
            return Messenger.builder()
                    .code(200)
                    .message("감정 분석 결과 조회 성공")
                    .data(model)
                    .build();
        } else {
            return Messenger.builder()
                    .code(404)
                    .message("감정 분석 결과를 찾을 수 없습니다.")
                    .build();
        }
    }

    @Override
    public Map<Long, DiaryEmotionModel> findByDiaryIdIn(List<Long> diaryIds) {
        if (diaryIds == null || diaryIds.isEmpty()) {
            return Map.of();
        }
        
        List<DiaryEmotion> emotions = diaryEmotionRepository.findByDiaryIdIn(diaryIds);
        
        Map<Long, DiaryEmotionModel> result = emotions.stream()
                .map(this::entityToModel)
                .filter(model -> model != null && model.getDiaryId() != null)
                .collect(Collectors.toMap(
                    DiaryEmotionModel::getDiaryId,
                    model -> model,
                    (existing, replacement) -> existing // 중복 키가 있으면 기존 값 유지
                ));
        
        return result;
    }

    @Override
    @Async("diaryAnalysisExecutor")
    @Transactional
    public void analyzeAndSaveAsync(Long diaryId, String title, String content) {
        log.info("일기 ID {} 감정 분석 시작 (비동기)...", diaryId);
        try {
            analyzeAndSave(diaryId, title, content);
        } catch (Exception e) {
            log.error("일기 ID {} 감정 분석 중 예외 발생: {}", diaryId, e.getMessage(), e);
        }
    }

    @Override
    @Transactional
    public Messenger analyzeAndSave(Long diaryId, String title, String content) {
        if (diaryId == null) {
            return Messenger.builder()
                    .code(400)
                    .message("일기 ID가 필요합니다.")
                    .build();
        }

        try {
            // 제목과 내용 결합
            String text = (title != null ? title : "") + " " + (content != null ? content : "");
            text = text.trim();
            
            if (text.isEmpty()) {
                log.warn("일기 ID {}의 텍스트가 비어있어 감정 분석을 건너뜁니다.", diaryId);
                return Messenger.builder()
                        .code(400)
                        .message("일기 내용이 비어있습니다.")
                        .build();
            }

            // Business Diary Service에 감정 분석 요청 (DL 모델 사용)
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("text", text);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            log.info("일기 ID {} 감정 분석 요청: DL 모델 사용 (Business Diary Service 호출 중)...", diaryId);
            log.info("Business Diary Service URL: {}", BUSINESS_SERVICE_URL);
            log.info("요청 본문: text length = {}", text.length());
            log.info("RestTemplate 타임아웃 설정: connectTimeout=10s, readTimeout=60s");
            
            ResponseEntity<Map> response;
            try {
                log.debug("HTTP POST 요청 시작: {}", BUSINESS_SERVICE_URL);
                response = restTemplate.postForEntity(
                    BUSINESS_SERVICE_URL,
                    request,
                    Map.class
                );
                log.info("일기 ID {} Business Diary Service 응답: status = {}, headers = {}", 
                    diaryId, response.getStatusCode(), response.getHeaders());
                if (response.getBody() != null) {
                    log.debug("응답 본문 키: {}", response.getBody().keySet());
                }
            } catch (org.springframework.web.client.ResourceAccessException e) {
                log.error("일기 ID {} Business Diary Service 연결 실패 - URL: {}", 
                    diaryId, BUSINESS_SERVICE_URL);
                log.error("연결 에러 상세: {}", e.getMessage());
                if (e.getCause() != null) {
                    log.error("원인: {}", e.getCause().getMessage());
                }
                throw e;
            } catch (org.springframework.web.client.HttpClientErrorException e) {
                log.error("일기 ID {} Business Diary Service HTTP 에러 - status: {}, body: {}", 
                    diaryId, e.getStatusCode(), e.getResponseBodyAsString());
                throw e;
            } catch (org.springframework.web.client.HttpServerErrorException e) {
                log.error("일기 ID {} Business Diary Service 서버 에러 - status: {}, body: {}", 
                    diaryId, e.getStatusCode(), e.getResponseBodyAsString());
                throw e;
            } catch (Exception e) {
                log.error("일기 ID {} Business Diary Service 호출 실패 - URL: {}, 에러 타입: {}, 메시지: {}", 
                    diaryId, BUSINESS_SERVICE_URL, e.getClass().getSimpleName(), e.getMessage(), e);
                throw e;
            }

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> result = response.getBody();
                
                Integer emotion = (Integer) result.get("emotion");
                String emotionLabel = (String) result.get("emotion_label");
                Map<String, Double> probabilities = (Map<String, Double>) result.get("probabilities");
                
                // confidence 계산 (가장 높은 확률)
                Double confidence = null;
                if (probabilities != null && !probabilities.isEmpty()) {
                    confidence = probabilities.values().stream()
                        .mapToDouble(Double::doubleValue)
                        .max()
                        .orElse(0.0);
                }

                // probabilities를 JSON 문자열로 변환
                String probabilitiesJson = null;
                if (probabilities != null && !probabilities.isEmpty()) {
                    try {
                        probabilitiesJson = objectMapper.writeValueAsString(probabilities);
                    } catch (JsonProcessingException e) {
                        log.warn("일기 ID {} probabilities JSON 변환 실패: {}", diaryId, e.getMessage());
                    }
                }

                // 감정 라벨이 없으면 코드로 매핑
                if (emotionLabel == null && emotion != null) {
                    emotionLabel = EMOTION_LABELS.get(emotion);
                }

                // 기존 감정 분석 결과 확인 후 업데이트 또는 생성
                DiaryEmotion diaryEmotion;
                try {
                    Optional<DiaryEmotion> existingEmotionOpt = diaryEmotionRepository.findByDiaryId(diaryId);

                    if (existingEmotionOpt.isPresent()) {
                        // 기존 결과 업데이트
                        DiaryEmotion existing = existingEmotionOpt.get();
                        existing.setEmotion(emotion);
                        existing.setEmotionLabel(emotionLabel);
                        existing.setConfidence(confidence);
                        existing.setProbabilities(probabilitiesJson);
                        existing.setAnalyzedAt(LocalDateTime.now());
                        diaryEmotion = diaryEmotionRepository.save(existing);
                        log.info("일기 ID {} 감정 분석 결과 업데이트: {} ({})", diaryId, emotionLabel, emotion);
                    } else {
                        // 새로 생성
                        diaryEmotion = DiaryEmotion.builder()
                            .diaryId(diaryId)
                            .emotion(emotion)
                            .emotionLabel(emotionLabel)
                            .confidence(confidence)
                            .probabilities(probabilitiesJson)
                            .analyzedAt(LocalDateTime.now())
                            .build();
                        diaryEmotion = diaryEmotionRepository.save(diaryEmotion);
                        log.info("일기 ID {} 감정 분석 결과 저장: {} ({})", diaryId, emotionLabel, emotion);
                    }
                } catch (org.springframework.dao.DataIntegrityViolationException e) {
                    // Duplicate key 에러 발생 시 다시 조회 후 업데이트 시도
                    log.warn("일기 ID {} 감정 분석 결과 저장 중 중복 키 에러 발생, 업데이트로 재시도", diaryId);
                    Optional<DiaryEmotion> existingEmotionOpt = diaryEmotionRepository.findByDiaryId(diaryId);
                    if (existingEmotionOpt.isPresent()) {
                        DiaryEmotion existing = existingEmotionOpt.get();
                        existing.setEmotion(emotion);
                        existing.setEmotionLabel(emotionLabel);
                        existing.setConfidence(confidence);
                        existing.setProbabilities(probabilitiesJson);
                        existing.setAnalyzedAt(LocalDateTime.now());
                        diaryEmotion = diaryEmotionRepository.save(existing);
                        log.info("일기 ID {} 감정 분석 결과 업데이트 완료 (재시도): {} ({})", diaryId, emotionLabel, emotion);
                    } else {
                        throw e; // 여전히 찾을 수 없으면 에러 전파
                    }
                }

                DiaryEmotionModel model = entityToModel(diaryEmotion);
                return Messenger.builder()
                        .code(200)
                        .message("감정 분석 완료: " + emotionLabel)
                        .data(model)
                        .build();
            } else {
                log.error("일기 ID {} 감정 분석 실패: Business Diary Service 응답 오류", diaryId);
                return Messenger.builder()
                        .code(500)
                        .message("Business Diary Service 응답 오류")
                        .build();
            }
        } catch (RestClientException e) {
            log.error("일기 ID {} 감정 분석 중 오류 발생: {}", diaryId, e.getMessage(), e);
            return Messenger.builder()
                    .code(500)
                    .message("감정 분석 중 오류 발생: " + e.getMessage())
                    .build();
        } catch (Exception e) {
            log.error("일기 ID {} 감정 분석 중 예상치 못한 오류 발생: {}", diaryId, e.getMessage(), e);
            return Messenger.builder()
                    .code(500)
                    .message("예상치 못한 오류 발생: " + e.getMessage())
                    .build();
        }
    }

    @Override
    @Transactional
    public Messenger deleteByDiaryId(Long diaryId) {
        if (diaryId == null) {
            return Messenger.builder()
                    .code(400)
                    .message("일기 ID가 필요합니다.")
                    .build();
        }

        try {
            diaryEmotionRepository.deleteByDiaryId(diaryId);
            log.info("일기 ID {}의 감정 분석 결과 삭제됨", diaryId);
            return Messenger.builder()
                    .code(200)
                    .message("감정 분석 결과 삭제 성공")
                    .build();
        } catch (Exception e) {
            log.error("일기 ID {} 감정 분석 결과 삭제 중 오류 발생: {}", diaryId, e.getMessage(), e);
            return Messenger.builder()
                    .code(500)
                    .message("삭제 중 오류 발생: " + e.getMessage())
                    .build();
        }
    }
}
