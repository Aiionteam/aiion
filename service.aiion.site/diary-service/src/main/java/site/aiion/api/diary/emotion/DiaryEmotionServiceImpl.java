package site.aiion.api.diary.emotion;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.RestClientException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
    
    // ML 서비스 URL (Docker 네트워크 내부에서 직접 접근)
    private static final String ML_SERVICE_URL = "http://aihoyun-ml-service:9005/diary-emotion/predict";
    
    // 감정 라벨 매핑
    private static final Map<Integer, String> EMOTION_LABELS = Map.of(
        0, "평가불가",
        1, "기쁨",
        2, "슬픔",
        3, "분노",
        4, "두려움",
        5, "혐오",
        6, "놀람"
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
        return emotions.stream()
                .map(this::entityToModel)
                .filter(model -> model != null && model.getDiaryId() != null)
                .collect(Collectors.toMap(
                    DiaryEmotionModel::getDiaryId,
                    model -> model,
                    (existing, replacement) -> existing // 중복 키가 있으면 기존 값 유지
                ));
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

            // ML 서비스에 감정 분석 요청
            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("text", text);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, String>> request = new HttpEntity<>(requestBody, headers);

            log.info("일기 ID {} 감정 분석 요청: ML 서비스 호출 중...", diaryId);
            ResponseEntity<Map> response = restTemplate.postForEntity(
                ML_SERVICE_URL,
                request,
                Map.class
            );

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

                // 감정 라벨이 없으면 코드로 매핑
                if (emotionLabel == null && emotion != null) {
                    emotionLabel = EMOTION_LABELS.get(emotion);
                }

                // 기존 감정 분석 결과 확인
                Optional<DiaryEmotion> existingEmotionOpt = diaryEmotionRepository.findByDiaryId(diaryId);

                DiaryEmotion diaryEmotion;
                if (existingEmotionOpt.isPresent()) {
                    // 기존 결과 업데이트
                    DiaryEmotion existing = existingEmotionOpt.get();
                    existing.setEmotion(emotion);
                    existing.setEmotionLabel(emotionLabel);
                    existing.setConfidence(confidence);
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
                        .analyzedAt(LocalDateTime.now())
                        .build();
                    diaryEmotion = diaryEmotionRepository.save(diaryEmotion);
                    log.info("일기 ID {} 감정 분석 결과 저장: {} ({})", diaryId, emotionLabel, emotion);
                }

                DiaryEmotionModel model = entityToModel(diaryEmotion);
                return Messenger.builder()
                        .code(200)
                        .message("감정 분석 완료: " + emotionLabel)
                        .data(model)
                        .build();
            } else {
                log.error("일기 ID {} 감정 분석 실패: ML 서비스 응답 오류", diaryId);
                return Messenger.builder()
                        .code(500)
                        .message("ML 서비스 응답 오류")
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
