package site.aiion.api.diary.mbti;

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
public class DiaryMbtiServiceImpl implements DiaryMbtiService {

    private final DiaryMbtiRepository diaryMbtiRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    // ML 서비스 URL (Docker 네트워크 내부에서 직접 접근)
    private static final String ML_SERVICE_URL = "http://aihoyun-ml-service:9005/diary-mbti/predict";
    
    // MBTI 차원별 라벨 매핑
    private static final Map<Integer, String> E_I_LABELS = Map.of(
        0, "평가불가",
        1, "E",
        2, "I"
    );
    
    private static final Map<Integer, String> S_N_LABELS = Map.of(
        0, "평가불가",
        1, "S",
        2, "N"
    );
    
    private static final Map<Integer, String> T_F_LABELS = Map.of(
        0, "평가불가",
        1, "T",
        2, "F"
    );
    
    private static final Map<Integer, String> J_P_LABELS = Map.of(
        0, "평가불가",
        1, "J",
        2, "P"
    );

    private DiaryMbtiModel entityToModel(DiaryMbti entity) {
        if (entity == null) {
            return null;
        }
        return DiaryMbtiModel.builder()
                .id(entity.getId())
                .diaryId(entity.getDiaryId())
                .eI(entity.getEI())
                .sN(entity.getSN())
                .tF(entity.getTF())
                .jP(entity.getJP())
                .mbtiType(entity.getMbtiType())
                .confidence(entity.getConfidence())
                .probabilities(entity.getProbabilities())
                .analyzedAt(entity.getAnalyzedAt())
                .build();
    }

    private DiaryMbti modelToEntity(DiaryMbtiModel model) {
        return DiaryMbti.builder()
                .id(model.getId())
                .diaryId(model.getDiaryId())
                .eI(model.getEI())
                .sN(model.getSN())
                .tF(model.getTF())
                .jP(model.getJP())
                .mbtiType(model.getMbtiType())
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
        
        Optional<DiaryMbti> mbti = diaryMbtiRepository.findByDiaryId(diaryId);
        if (mbti.isPresent()) {
            DiaryMbtiModel model = entityToModel(mbti.get());
            return Messenger.builder()
                    .code(200)
                    .message("MBTI 분석 결과 조회 성공")
                    .data(model)
                    .build();
        } else {
            return Messenger.builder()
                    .code(404)
                    .message("MBTI 분석 결과를 찾을 수 없습니다.")
                    .build();
        }
    }

    @Override
    public Map<Long, DiaryMbtiModel> findByDiaryIdIn(List<Long> diaryIds) {
        if (diaryIds == null || diaryIds.isEmpty()) {
            return Map.of();
        }
        
        List<DiaryMbti> mbtis = diaryMbtiRepository.findByDiaryIdIn(diaryIds);
        
        Map<Long, DiaryMbtiModel> result = mbtis.stream()
                .map(this::entityToModel)
                .filter(model -> model != null && model.getDiaryId() != null)
                .collect(Collectors.toMap(
                    DiaryMbtiModel::getDiaryId,
                    model -> model,
                    (existing, replacement) -> existing // 중복 키가 있으면 기존 값 유지
                ));
        
        return result;
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
                log.warn("일기 ID {}의 텍스트가 비어있어 MBTI 분석을 건너뜁니다.", diaryId);
                return Messenger.builder()
                        .code(400)
                        .message("일기 내용이 비어있습니다.")
                        .build();
            }

            // ML 서비스에 MBTI 분석 요청
            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("text", text);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, String>> request = new HttpEntity<>(requestBody, headers);

            log.info("일기 ID {} MBTI 분석 요청: ML 서비스 호출 중...", diaryId);
            ResponseEntity<Map> response = restTemplate.postForEntity(
                ML_SERVICE_URL,
                request,
                Map.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> result = response.getBody();
                
                // ML 서비스 응답 파싱 (null 체크 강화)
                Object eIObj = result.get("E_I");
                Object sNObj = result.get("S_N");
                Object tFObj = result.get("T_F");
                Object jPObj = result.get("J_P");
                
                // null 체크 및 타입 변환
                Integer eI = 0;
                if (eIObj != null) {
                    if (eIObj instanceof Integer) {
                        eI = (Integer) eIObj;
                    } else if (eIObj instanceof Number) {
                        eI = ((Number) eIObj).intValue();
                    }
                }
                
                Integer sN = 0;
                if (sNObj != null) {
                    if (sNObj instanceof Integer) {
                        sN = (Integer) sNObj;
                    } else if (sNObj instanceof Number) {
                        sN = ((Number) sNObj).intValue();
                    }
                }
                
                Integer tF = 0;
                if (tFObj != null) {
                    if (tFObj instanceof Integer) {
                        tF = (Integer) tFObj;
                    } else if (tFObj instanceof Number) {
                        tF = ((Number) tFObj).intValue();
                    }
                }
                
                Integer jP = 0;
                if (jPObj != null) {
                    if (jPObj instanceof Integer) {
                        jP = (Integer) jPObj;
                    } else if (jPObj instanceof Number) {
                        jP = ((Number) jPObj).intValue();
                    }
                }
                
                String mbtiType = (String) result.get("mbti_type");
                
                // confidence 계산 (ML 서비스에서 제공하거나 기본값)
                Double confidence = null;
                if (result.containsKey("confidence")) {
                    Object confObj = result.get("confidence");
                    if (confObj instanceof Number) {
                        confidence = ((Number) confObj).doubleValue();
                    }
                }

                // probabilities를 JSON 문자열로 변환
                String probabilitiesJson = null;
                if (result.containsKey("probabilities")) {
                    try {
                        Map<String, Object> probabilities = (Map<String, Object>) result.get("probabilities");
                        probabilitiesJson = objectMapper.writeValueAsString(probabilities);
                    } catch (JsonProcessingException e) {
                        log.warn("일기 ID {} probabilities JSON 변환 실패: {}", diaryId, e.getMessage());
                    }
                }

                // MBTI 타입 문자열 생성 (없는 경우)
                if (mbtiType == null || mbtiType.isEmpty()) {
                    if (eI == 0 || sN == 0 || tF == 0 || jP == 0) {
                        mbtiType = "평가불가";
                    } else {
                        String eILabel = E_I_LABELS.get(eI);
                        String sNLabel = S_N_LABELS.get(sN);
                        String tFLabel = T_F_LABELS.get(tF);
                        String jPLabel = J_P_LABELS.get(jP);
                        
                        if (eILabel != null && sNLabel != null && tFLabel != null && jPLabel != null) {
                            mbtiType = eILabel + sNLabel + tFLabel + jPLabel;
                        } else {
                            mbtiType = "평가불가";
                        }
                    }
                }

                // 필수 필드 최종 검증
                if (eI == null || sN == null || tF == null || jP == null) {
                    log.error("일기 ID {} MBTI 분석 실패: 필수 필드가 null입니다. eI={}, sN={}, tF={}, jP={}", 
                        diaryId, eI, sN, tF, jP);
                    return Messenger.builder()
                            .code(500)
                            .message("MBTI 분석 결과에 필수 필드가 없습니다.")
                            .build();
                }
                
                // 기존 MBTI 분석 결과 확인 (예외 처리 강화)
                Optional<DiaryMbti> existingMbtiOpt = Optional.empty();
                try {
                    existingMbtiOpt = diaryMbtiRepository.findByDiaryId(diaryId);
                } catch (Exception e) {
                    log.error("일기 ID {} 기존 MBTI 조회 실패: {}", diaryId, e.getMessage(), e);
                    // 조회 실패 시 새로 생성하도록 empty로 유지
                }

                DiaryMbti diaryMbti;
                try {
                    if (existingMbtiOpt.isPresent()) {
                        // 기존 결과 업데이트
                        DiaryMbti existing = existingMbtiOpt.get();
                        existing.setEI(eI);
                        existing.setSN(sN);
                        existing.setTF(tF);
                        existing.setJP(jP);
                        existing.setMbtiType(mbtiType);
                        existing.setConfidence(confidence);
                        existing.setProbabilities(probabilitiesJson);
                        existing.setAnalyzedAt(LocalDateTime.now());
                        diaryMbti = diaryMbtiRepository.save(existing);
                        log.info("일기 ID {} MBTI 분석 결과 업데이트: {}", diaryId, mbtiType);
                    } else {
                        // 새로 생성
                        diaryMbti = DiaryMbti.builder()
                            .diaryId(diaryId)
                            .eI(eI)
                            .sN(sN)
                            .tF(tF)
                            .jP(jP)
                            .mbtiType(mbtiType)
                            .confidence(confidence)
                            .probabilities(probabilitiesJson)
                            .analyzedAt(LocalDateTime.now())
                            .build();
                        diaryMbti = diaryMbtiRepository.save(diaryMbti);
                        log.info("일기 ID {} MBTI 분석 결과 저장: {}", diaryId, mbtiType);
                    }
                } catch (Exception e) {
                    log.error("일기 ID {} MBTI 저장 실패: {}", diaryId, e.getMessage(), e);
                    return Messenger.builder()
                            .code(500)
                            .message("MBTI 분석 결과 저장 중 오류 발생: " + e.getMessage())
                            .build();
                }

                DiaryMbtiModel model = entityToModel(diaryMbti);
                return Messenger.builder()
                        .code(200)
                        .message("MBTI 분석 완료: " + mbtiType)
                        .data(model)
                        .build();
            } else {
                log.error("일기 ID {} MBTI 분석 실패: ML 서비스 응답 오류", diaryId);
                return Messenger.builder()
                        .code(500)
                        .message("ML 서비스 응답 오류")
                        .build();
            }
        } catch (RestClientException e) {
            log.error("일기 ID {} MBTI 분석 중 오류 발생: {}", diaryId, e.getMessage(), e);
            return Messenger.builder()
                    .code(500)
                    .message("MBTI 분석 중 오류 발생: " + e.getMessage())
                    .build();
        } catch (Exception e) {
            log.error("일기 ID {} MBTI 분석 중 예상치 못한 오류 발생: {}", diaryId, e.getMessage(), e);
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
            diaryMbtiRepository.deleteByDiaryId(diaryId);
            log.info("일기 ID {}의 MBTI 분석 결과 삭제됨", diaryId);
            return Messenger.builder()
                    .code(200)
                    .message("MBTI 분석 결과 삭제 성공")
                    .build();
        } catch (Exception e) {
            log.error("일기 ID {} MBTI 분석 결과 삭제 중 오류 발생: {}", diaryId, e.getMessage(), e);
            return Messenger.builder()
                    .code(500)
                    .message("삭제 중 오류 발생: " + e.getMessage())
                    .build();
        }
    }
}

